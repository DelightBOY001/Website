/**
 * NEXUS ARENA — Functional API tests
 *
 * Boots an in-memory MongoDB, starts the production server against it,
 * then exercises the HTTP API end-to-end: auth, RBAC, tournaments,
 * registration, free-tournament payments, notifications and admin guards.
 *
 * Usage:  npm run test:api   (requires a prior `npm run build`)
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_PORT = 4321;
let BASE = `http://127.0.0.1:${DEFAULT_PORT}`;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, extra = '') {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name + (extra ? ` — ${extra}` : ''));
    console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

/** Minimal cookie jar (nexus_session + csrf). */
class Jar {
  cookies = new Map<string, string>();
  absorb(res: Response) {
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(';');
      const idx = pair.indexOf('=');
      if (idx > 0) this.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }
  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

async function req(
  jar: Jar,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: any; res: Response }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const cookie = jar.header();
  if (cookie) headers.cookie = cookie;
  const csrf = jar.cookies.get('nexus_csrf');
  if (csrf) headers['x-csrf-token'] = csrf;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  jar.absorb(res);
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json, res };
}

async function waitForServer(child: ChildProcess, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null) throw new Error('Server exited early');
    try {
      const res = await fetch(BASE + '/api/games');
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error('Server did not start in time');
}

async function main() {
  console.log('🧪 NEXUS ARENA functional API tests\n');

  // Clear stale mongodb-memory-server tmp dirs (they fill up /tmp after killed runs).
  try {
    const { readdirSync } = await import('node:fs');
    for (const entry of readdirSync(tmpdir())) {
      if (entry.startsWith('mongo-mem-')) {
        try {
          rmSync(join(tmpdir(), entry), { recursive: true, force: true });
        } catch {
          /* best effort */
        }
      }
    }
  } catch {
    /* best effort */
  }

  // Find a free port.
  const net = await import('node:net');
  const port = await new Promise<number>((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(DEFAULT_PORT + 1 + Math.floor(Math.random() * 200)));
    probe.once('listening', () => {
      const p = (probe.address() as { port: number }).port;
      probe.close(() => resolve(p));
    });
    probe.listen(0, '127.0.0.1');
  });
  BASE = `http://127.0.0.1:${port}`;

  // 1. In-memory MongoDB shared between this process and the server.
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('nexus-arena');
  console.log(`[test] MongoDB: ${uri}`);

  // 2. Start production server against it.
  const child = spawn(
    process.execPath,
    [join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port)],
    {
      env: {
        ...process.env,
        MONGODB_URI: uri,
        AUTH_SECRET: 'test-secret-0123456789abcdefghij',
        NEXT_PUBLIC_APP_URL: BASE,
        NODE_ENV: 'production',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    },
  );
  child.stderr?.on('data', (d) => {
    const s = String(d);
    if (/error/i.test(s)) console.log('[server]', s.slice(0, 300));
  });

  try {
    await waitForServer(child);
    console.log('[test] Server ready\n');

    /* ── Public data ─────────────────────────────────────────── */
    console.log('▶ Public API');
    const games = await req(new Jar(), 'GET', '/api/games');
    ok('GET /api/games → 200 with items', games.status === 200 && Array.isArray(games.json?.items), `status=${games.status}`);

    const lb = await req(new Jar(), 'GET', '/api/leaderboard');
    ok('GET /api/leaderboard → 200', lb.status === 200, `status=${lb.status}`);

    const list = await req(new Jar(), 'GET', '/api/tournaments?page=1&limit=12');
    ok('GET /api/tournaments → 200 paginated', list.status === 200 && typeof list.json?.pages === 'number', `status=${list.status}`);

    /* ── Auth ────────────────────────────────────────────────── */
    console.log('▶ Auth & sessions');
    const bad = await req(new Jar(), 'POST', '/api/auth/register', {
      name: 'Test User',
      username: 'testuser',
      email: 'not-an-email',
      password: '123',
    });
    ok('POST /api/auth/register rejects invalid payload (400/422)', bad.status === 400 || bad.status === 422, `status=${bad.status}`);

    const player = new Jar();
    const reg = await req(player, 'POST', '/api/auth/register', {
      name: 'Test Player',
      username: 'testplayer',
      email: 'player@test.gg',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });
    ok('POST /api/auth/register creates user', reg.status === 200 || reg.status === 201, `status=${reg.status} ${JSON.stringify(reg.json).slice(0, 120)}`);

    const me0 = await req(player, 'GET', '/api/me/profile');
    ok('GET /api/me/profile (session cookie) → 200', me0.status === 200 && me0.json?.user, `status=${me0.status}`);

    const wrongLogin = await req(new Jar(), 'POST', '/api/auth/login', {
      email: 'player@test.gg',
      password: 'wrong-password',
    });
    ok('POST /api/auth/login rejects wrong password (401)', wrongLogin.status === 401, `status=${wrongLogin.status}`);

    const loginJar = new Jar();
    const login = await req(loginJar, 'POST', '/api/auth/login', {
      email: 'player@test.gg',
      password: 'Password@123',
    });
    ok('POST /api/auth/login → 200 + session cookie', login.status === 200 && loginJar.cookies.has('nexus_session'), `status=${login.status}`);

    /* ── RBAC ────────────────────────────────────────────────── */
    console.log('▶ RBAC guards');
    const adminHit = await req(player, 'GET', '/api/admin/overview');
    ok('Player blocked from /api/admin/overview (401/403)', adminHit.status === 401 || adminHit.status === 403, `status=${adminHit.status}`);

    const createAsPlayer = await req(player, 'POST', '/api/tournaments', {
      title: 'Should Fail',
      game: '000000000000000000000000',
      format: 'single_elimination',
      type: 'solo',
      maxParticipants: 8,
      startsAt: new Date(Date.now() + 86400000).toISOString(),
    });
    ok(
      'Player cannot create tournaments (401/403) or fails validation (400)',
      [400, 401, 403].includes(createAsPlayer.status),
      `status=${createAsPlayer.status}`,
    );

    /* ── Profile & notifications ─────────────────────────────── */
    console.log('▶ User APIs');
    const patch = await req(player, 'PATCH', '/api/me/profile', {
      name: 'Test Player Renamed',
      bio: 'Grinding ranks since day one.',
    });
    ok('PATCH /api/me/profile updates profile', patch.status === 200, `status=${patch.status}`);
    ok('Profile change persisted', patch.json?.user?.name === 'Test Player Renamed', JSON.stringify(patch.json).slice(0, 120));

    const notif = await req(player, 'GET', '/api/notifications');
    ok('GET /api/notifications → 200', notif.status === 200 && Array.isArray(notif.json?.items), `status=${notif.status}`);

    const stats = await req(player, 'GET', '/api/me/stats');
    ok('GET /api/me/stats → 200 with stats', stats.status === 200 && stats.json?.stats, `status=${stats.status}`);

    /* ── Organizer flow via DB promotion ─────────────────────── */
    console.log('▶ Organizer flow (promoted via DB)');
    await mongoose.connect(uri);
    const db = mongoose.connection.db!;
    await db.collection('users').updateOne(
      { email: 'player@test.gg' },
      { $set: { role: 'organizer', emailVerified: true } },
    );
    // Roles are embedded in the session JWT — re-login to pick up the new role.
    const relogin = await req(player, 'POST', '/api/auth/login', {
      email: 'player@test.gg',
      password: 'Password@123',
    });
    ok('Re-login after role change (200)', relogin.status === 200, `status=${relogin.status}`);
    let gameDoc = await db.collection('games').findOne({});
    if (!gameDoc) {
      const inserted = await db.collection('games').insertOne({
        name: 'Test Game',
        slug: 'test-game',
        genre: 'FPS',
        platform: ['PC'],
        isActive: true,
        colorHex: '#00f0ff',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      gameDoc = await db.collection('games').findOne({ _id: inserted.insertedId });
      if (!gameDoc) throw new Error('Failed to create game doc');
    }

    const create = await req(player, 'POST', '/api/tournaments', {
      title: 'Test Cup',
      tagline: 'Automated test event',
      description: 'Created by the functional test suite.',
      rules: 'Be nice.',
      game: String(gameDoc._id),
      format: 'single_elimination',
      type: 'solo',
      maxParticipants: 8,
      entryFee: 0,
      prizePool: 1000,
      startsAt: new Date(Date.now() + 86400000).toISOString(),
    });
    ok('Organizer creates tournament (200/201)', create.status === 200 || create.status === 201, `status=${create.status} ${JSON.stringify(create.json).slice(0, 160)}`);

    const slug = create.json?.tournament?.slug ?? create.json?.slug;
    ok('Tournament has slug', Boolean(slug), String(slug));

    if (slug) {
      const detail = await req(player, 'GET', `/api/tournaments/${slug}`);
      ok('GET /api/tournaments/[slug] → 200', detail.status === 200 && detail.json?.tournament, `status=${detail.status}`);

      const tid = detail.json.tournament._id;
      const pay = await req(player, 'POST', '/api/payments/order', {
        tournamentId: tid,
        inGameName: 'TestIGN',
        discordId: 'test#0001',
        agreedToRules: true,
      });
      ok(
        'Free tournament registration via /api/payments/order',
        (pay.status === 200 || pay.status === 201) && (pay.json?.free || pay.json?.registration),
        `status=${pay.status} ${JSON.stringify(pay.json).slice(0, 140)}`,
      );

      const myT = await req(player, 'GET', '/api/me/tournaments');
      ok('GET /api/me/tournaments → 200', myT.status === 200, `status=${myT.status}`);

      /* ── Admin match search + result correction ─────────────── */
      console.log('▶ Admin match search and result correction');
      const opponent = new Jar();
      const opponentReg = await req(opponent, 'POST', '/api/auth/register', {
        name: 'Second Test Player',
        username: 'secondtestplayer',
        email: 'second-player@test.gg',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });
      ok('Create second match participant', opponentReg.status === 200 || opponentReg.status === 201, `status=${opponentReg.status}`);

      const playerDoc = await db.collection('users').findOne({ email: 'player@test.gg' });
      const opponentDoc = await db.collection('users').findOne({ email: 'second-player@test.gg' });
      await db.collection('users').updateOne({ _id: playerDoc!._id }, { $set: { role: 'moderator', emailVerified: true } });
      await req(player, 'POST', '/api/auth/login', {
        email: 'player@test.gg',
        password: 'Password@123',
      });

      const matchId = new mongoose.Types.ObjectId();
      await db.collection('matches').insertOne({
        _id: matchId,
        tournament: new mongoose.Types.ObjectId(tid),
        matchNumber: 9001,
        round: 1,
        roundName: 'Final',
        position: 0,
        stage: 'knockout',
        format: 'bo3',
        participant1: { kind: 'user', ref: playerDoc!._id, name: 'Test Player Renamed', seed: 1, score: 0, logo: '' },
        participant2: { kind: 'user', ref: opponentDoc!._id, name: 'Second Test Player', seed: 2, score: 0, logo: '' },
        winner: { kind: 'none', ref: null, name: '' },
        loser: { kind: 'none', ref: null, name: '' },
        status: 'pending',
        scores: [],
        scheduledAt: new Date(),
        nextMatchNumber: 0,
        nextMatchSlot: 0,
        loserNextMatchNumber: 0,
        loserNextMatchSlot: 0,
        reportedBy: null,
        confirmedBy: null,
        disputeOpen: false,
        disputeReason: '',
        isBye: false,
        isThirdPlace: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const searchMatch = await req(player, 'GET', '/api/admin/matches?search=Second%20Test%20Player');
      ok('Admin match search finds a participant', searchMatch.status === 200 && searchMatch.json?.items?.some((m: any) => m._id === String(matchId)), `status=${searchMatch.status}`);

      const firstResult = await req(player, 'POST', `/api/matches/${matchId}/winner`, {
        winnerSlot: 1,
        score1: 2,
        score2: 1,
        reason: 'Initial test result',
      });
      ok('Set a scored match result', firstResult.status === 200, `status=${firstResult.status}`);

      const correction = await req(player, 'POST', `/api/matches/${matchId}/winner`, {
        winnerSlot: 2,
        score1: 0,
        score2: 2,
        reason: 'Corrected test result',
      });
      ok('Correct a completed final result', correction.status === 200, `status=${correction.status} ${JSON.stringify(correction.json).slice(0, 160)}`);

      const playerAfter = await db.collection('users').findOne({ _id: playerDoc!._id });
      const opponentAfter = await db.collection('users').findOne({ _id: opponentDoc!._id });
      const finishedTournament = await db.collection('tournaments').findOne({ _id: new mongoose.Types.ObjectId(tid) });
      ok('Match stats move to the corrected winner', playerAfter?.stats?.wins === 0 && playerAfter?.stats?.losses === 1 && opponentAfter?.stats?.wins === 1 && opponentAfter?.stats?.losses === 0);
      ok('Completed tournament champion updates', String(finishedTournament?.winner?.ref) === String(opponentDoc!._id));
    }

    /* ── Payments verification hardening ─────────────────────── */
    console.log('▶ Payment security');
    // Seed a pending payment so verify reaches the signature check.
    const playerUser = await db.collection('users').findOne({ email: 'player@test.gg' });
    const fakeTournament = await db.collection('tournaments').findOne({});
    await db.collection('payments').insertOne({
      user: playerUser!._id,
      tournament: fakeTournament?._id ?? null,
      amount: 19900,
      currency: 'INR',
      status: 'created',
      method: 'upi',
      razorpayOrderId: 'order_fake',
      invoiceNumber: 'INV-TEST-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const fakeVerify = await req(player, 'POST', '/api/payments/verify', {
      razorpay_order_id: 'order_fake',
      razorpay_payment_id: 'pay_fake',
      razorpay_signature: 'bogus-signature',
    });
    // Without RAZORPAY keys the API refuses verification outright (402); with keys
    // configured a forged HMAC signature is rejected with 400/422. Either way: never 200.
    ok(
      'Forged payment verification never succeeds (400/402/422)',
      [400, 402, 422].includes(fakeVerify.status),
      `status=${fakeVerify.status} ${JSON.stringify(fakeVerify.json).slice(0, 120)}`,
    );

    /* ── AI (data mode) ──────────────────────────────────────── */
    console.log('▶ AI assistant (data mode)');
    const ai = await req(player, 'POST', '/api/ai/chat', { message: 'What tournaments are open?' });
    ok('POST /api/ai/chat answers (200)', ai.status === 200 && typeof ai.json?.answer === 'string', `status=${ai.status}`);
    await db.collection('users').updateOne({ email: 'player@test.gg' }, { $set: { role: 'player' } });
    await req(player, 'POST', '/api/auth/login', { email: 'player@test.gg', password: 'Password@123' });
    const aiAdmin = await req(player, 'POST', '/api/ai/admin', { message: 'revenue today' });
    ok('Player blocked from admin AI (401/403)', aiAdmin.status === 401 || aiAdmin.status === 403, `status=${aiAdmin.status}`);

    /* ── Realtime endpoint ───────────────────────────────────── */
    console.log('▶ Realtime SSE');
    const ctrl = new AbortController();
    const ssePromise = fetch(`${BASE}/api/realtime?channels=global`, { signal: ctrl.signal });
    const timeout = new Promise((r) => setTimeout(() => r('timeout'), 1500));
    const sseRes = await Promise.race([ssePromise, timeout]);
    ok('GET /api/realtime opens an SSE stream', sseRes !== 'timeout' && (sseRes as Response).status === 200);
    ctrl.abort();
  } finally {
    try {
      if (child.pid) process.kill(-child.pid, 'SIGTERM');
    } catch {
      try {
        child.kill('SIGTERM');
      } catch {
        /* already dead */
      }
    }
    await mongoose.disconnect().catch(() => undefined);
    await mongod.stop();
  }

  console.log(`\n───────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('Failures:');
    for (const f of failures) console.log('  •', f);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Test harness crashed:', err);
  process.exit(1);
});
