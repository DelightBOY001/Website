/**
 * NEXUS ARENA — Database Seed Script
 *
 * Usage:
 *   MONGODB_URI="mongodb://localhost:27017/nexus-arena" npm run seed
 *   MONGODB_URI="memory" npm run seed        # in-memory DB (prints stats then exits)
 *
 * Creates: 6 games, admin + organizer + 30 players, 8 teams,
 * 6 tournaments (various formats/statuses), registrations, payments,
 * notifications and audit entries. Idempotent-ish (checks for existing users).
 */
import { connectDB, disconnectDB } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import {
  UserModel,
  GameModel,
  TournamentModel,
  TeamModel,
  RegistrationModel,
  MatchModel,
  PaymentModel,
  NotificationModel,
  AdminLogModel,
  BracketModel,
} from '../src/models';
import { generateBracket } from '../src/lib/bracket-engine';

const INR = (n: number) => Math.round(n * 100); // paise

const GAMES = [
  { name: 'Valorant', slug: 'valorant', genre: 'FPS', platform: ['PC'], colorHex: '#ff4655', description: '5v5 tactical shooter', isActive: true },
  { name: 'BGMI', slug: 'bgmi', genre: 'Battle Royale', platform: ['Mobile'], colorHex: '#fbbf24', description: 'Battlegrounds Mobile India', isActive: true },
  { name: 'Free Fire MAX', slug: 'free-fire-max', genre: 'Battle Royale', platform: ['Mobile'], colorHex: '#f97316', description: 'Fast-paced mobile BR', isActive: true },
  { name: 'Call of Duty Mobile', slug: 'cod-mobile', genre: 'FPS', platform: ['Mobile'], colorHex: '#22c55e', description: 'CODM multiplayer & BR', isActive: true },
  { name: 'CS2', slug: 'cs2', genre: 'FPS', platform: ['PC'], colorHex: '#f59e0b', description: 'Counter-Strike 2', isActive: true },
  { name: 'League of Legends', slug: 'league-of-legends', genre: 'MOBA', platform: ['PC'], colorHex: '#0ea5e9', description: 'The classic MOBA', isActive: true },
  { name: 'Apex Legends', slug: 'apex-legends', genre: 'Battle Royale', platform: ['PC', 'Console'], colorHex: '#ef4444', description: 'Hero-based BR', isActive: true },
  { name: 'Clash Royale', slug: 'clash-royale', genre: 'Strategy', platform: ['Mobile'], colorHex: '#8b5cf6', description: 'Real-time strategy duels', isActive: true },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('🏟️  NEXUS ARENA seed starting...');
  await connectDB();

  const existing = await UserModel.countDocuments();
  if (existing > 0) {
    console.log(`Database already has ${existing} users — seeding only missing pieces.`);
  }

  // Games
  const games: Record<string, any> = {};
  for (const g of GAMES) {
    let doc = await GameModel.findOne({ slug: g.slug });
    if (!doc) doc = await GameModel.create(g);
    games[g.slug] = doc;
  }
  console.log(`✅ ${Object.keys(games).length} games`);

  // Users
  const passwordHash = await hashPassword('Password@123');
  const mkUser = async (over: Record<string, unknown>) => {
    return UserModel.create({
      name: 'Player',
      username: `user_${Math.random().toString(36).slice(2, 10)}`,
      email: `user_${Math.random().toString(36).slice(2, 10)}@nexusarena.gg`,
      playerId: `NXS-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${String(Math.floor(Math.random() * 900) + 100)}`,
      passwordHash,
      emailVerified: true,
      status: 'active',
      role: 'player',
      region: 'IN',
      country: 'IN',
      ...over,
    });
  };

  const admin = await UserModel.findOne({ email: 'admin@nexusarena.gg' }) ??
    (await mkUser({
      name: 'Aarav Sharma',
      username: 'admin',
      email: 'admin@nexusarena.gg',
      role: 'super_admin',
      region: 'IN',
    }));

  const organizer = await UserModel.findOne({ email: 'organizer@nexusarena.gg' }) ??
    (await mkUser({
      name: 'Priya Patel',
      username: 'organizer',
      email: 'organizer@nexusarena.gg',
      role: 'organizer',
      region: 'IN',
    }));

  const NAMES = [
    'Arjun Mehta', 'Rohan Gupta', 'Aditya Singh', 'Vivaan Nair', 'Kabir Joshi',
    'Ishaan Verma', 'Aryan Reddy', 'Dev Malhotra', 'Reyansh Kapoor', 'Krish Iyer',
    'Ananya Sharma', 'Diya Reddy', 'Saanvi Gupta', 'Aadhya Nair', 'Myra Joshi',
    'Sara Khan', 'Zara Patel', 'Navya Singh', 'Riya Malhotra', 'Anika Verma',
    'Neel Chatterjee', 'Om Prakash', 'Yash Thakur', 'Dhruv Bhatt', 'Rudra Sinha',
    'Aarush Jain', 'Vihaan Rao', 'Shrey Pandey', 'Kunal Deshmukh', 'Harsh Vora',
  ];
  const players: any[] = [];
  for (const name of NAMES) {
    const username = slugify(name).replace(/-/g, '_');
    const p = await UserModel.findOne({ username }) ?? (await mkUser({
      name,
      username,
      email: `${username}@nexusarena.gg`,
      playerId: `NXS-${username.slice(0, 6).toUpperCase()}-${String(Math.floor(Math.random() * 900) + 100)}`,
      stats: {
        matchesPlayed: Math.floor(Math.random() * 60),
        wins: Math.floor(Math.random() * 35),
        losses: Math.floor(Math.random() * 25),
        earnings: Math.floor(Math.random() * 40000),
        points: Math.floor(Math.random() * 2500),
        winStreak: Math.floor(Math.random() * 8),
        rank: Math.floor(Math.random() * 500) + 1,
      },
    }));
    players.push(p);
  }
  console.log(`✅ ${players.length + 2} users (admin@nexusarena.gg / organizer@nexusarena.gg — Password@123)`);

  // Teams
  const TEAM_NAMES = ['Phoenix Rising', 'Shadow Wolves', 'Neon Vipers', 'Thunder Hawks', 'Cyber Strikers', 'Iron Dragons', 'Night Owls', 'Blaze Force'];
  const teams: any[] = [];
  for (let i = 0; i < TEAM_NAMES.length; i++) {
    const captain = players[i * 3];
    const members = players.slice(i * 3, i * 3 + 5).map((p) => ({
      user: p._id, role: 'player', status: 'active', joinedAt: new Date(),
    }));
    members[0].role = 'captain';
    const t = await TeamModel.create({
      name: TEAM_NAMES[i],
      tag: TEAM_NAMES[i].split(' ').map((w) => w[0]).join('').slice(0, 4).toUpperCase(),
      slug: slugify(TEAM_NAMES[i]),
      captain: captain._id,
      members,
      game: games['valorant']._id,
      color: ['#8b5cf6', '#22d3ee', '#f43f5e', '#fbbf24'][i % 4],
      maxSize: 6,
      inviteCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
    });
    teams.push(t);
  }
  console.log(`✅ ${teams.length} teams`);

  // Tournaments
  const now = Date.now();
  const day = 86_400_000;
  const mkT = async (over: Record<string, unknown>) =>
    TournamentModel.create({
      slug: Math.random().toString(36).slice(2, 10),
      entryFee: 19900,
      prizePool: 500000,
      rules: 'Standard NEXUS ARENA competitive ruleset applies.',
      region: 'IN',
      platform: 'PC',
      online: true,
      seeding: 'auto',
      teamSize: 5,
      createdBy: organizer._id,
      organizer: organizer._id,
      ...over,
    });

  const tournaments: any[] = [];
  tournaments.push(await mkT({
    title: 'Valorant Pro Cup 2026', slug: 'valorant-pro-cup-2026', game: games['valorant']._id,
    format: 'single_elimination', type: 'team', maxParticipants: 16,
    entryFee: INR(499), prizePool: INR(25000),
    startsAt: new Date(now + 2 * day), status: 'registration',
    tagline: 'The ultimate showdown for supremacy', featured: true,
    banners: { hero: '', thumbnail: '' }, prizes: [
      { position: 1, label: 'Champion', amount: INR(15000), distributed: false },
      { position: 2, label: 'Runner-up', amount: INR(7000), distributed: false },
      { position: 3, label: 'Third place', amount: INR(3000), distributed: false },
    ],
  }));
  tournaments.push(await mkT({
    title: 'BGMI Mobile Masters', slug: 'bgmi-mobile-masters', game: games['bgmi']._id,
    format: 'single_elimination', type: 'solo', maxParticipants: 64,
    entryFee: INR(99), prizePool: INR(10000), startsAt: new Date(now + 5 * day),
    status: 'registration', tagline: 'Mobile legends collide', featured: true,
    prizes: [
      { position: 1, label: 'Champion', amount: INR(5000), distributed: false },
      { position: 2, label: 'Runner-up', amount: INR(3000), distributed: false },
      { position: 3, label: 'Third place', amount: INR(2000), distributed: false },
    ],
  }));
  tournaments.push(await mkT({
    title: 'CS2 Weekend Clash', slug: 'cs2-weekend-clash', game: games['cs2']._id,
    format: 'double_elimination', type: 'team', maxParticipants: 8,
    entryFee: INR(299), prizePool: INR(8000), startsAt: new Date(now + 1 * day),
    status: 'registration', tagline: 'Double elim. Zero mercy.',
    prizes: [{ position: 1, label: 'Champion', amount: INR(5000), distributed: false }, { position: 2, label: 'Runner-up', amount: INR(3000), distributed: false }],
  }));
  tournaments.push(await mkT({
    title: 'Sunday Solo Showdown', slug: 'sunday-solo-showdown', game: games['valorant']._id,
    format: 'swiss', type: 'solo', maxParticipants: 32, entryFee: 0,
    prizePool: INR(2000), startsAt: new Date(now - 3 * day), status: 'completed',
    tagline: 'Free entry. Real glory.',
    winners: [{ position: 1, user: players[0]._id, team: null, amount: INR(2000), paidAt: new Date() }],
  }));
  tournaments.push(await mkT({
    title: 'Clash Royale Ladder Cup', slug: 'clash-royale-ladder-cup', game: games['clash-royale']._id,
    format: 'round_robin', type: 'solo', maxParticipants: 12, entryFee: INR(49),
    prizePool: INR(1500), startsAt: new Date(now + 10 * day), status: 'draft',
    tagline: 'Climb the ladder',
  }));
  tournaments.push(await mkT({
    title: 'Neon Nights Invitational', slug: 'neon-nights-invitational', game: games['valorant']._id,
    format: 'group_knockout', type: 'team', maxParticipants: 16, entryFee: INR(999),
    prizePool: INR(50000), startsAt: new Date(now + 7 * day), status: 'registration',
    tagline: 'Where legends rise', featured: true,
    prizes: [{ position: 1, label: 'Champion', amount: INR(30000), distributed: false }, { position: 2, label: 'Runner-up', amount: INR(12000), distributed: false }, { position: 3, label: 'Third place', amount: INR(8000), distributed: false }],
  }));
  console.log(`✅ ${tournaments.length} tournaments`);

  // Registrations + payments on the first tournament
  const t0 = tournaments[0];
  for (let i = 0; i < 8; i++) {
    const team = teams[i];
    const captain = players[i * 3];
    const pay = await PaymentModel.create({
      user: captain._id, tournament: t0._id, team: team._id,
      amount: t0.entryFee, currency: 'INR', status: 'captured',
      method: i % 2 === 0 ? 'upi' : 'card',
      razorpayOrderId: `order_seed_${i}`, razorpayPaymentId: `pay_seed_${i}`,
      invoiceNumber: `INV-SEED-${1000 + i}`,
    });
    await RegistrationModel.create({
      tournament: t0._id, user: captain._id, team: team._id,
      type: 'team', status: 'confirmed',
      registrationId: `NXS-T-${Date.now()}-${i}`,
      seed: i + 1, checkedIn: i < 4, confirmedAt: new Date(),
      payment: pay._id,
    });
    t0.participantsCount += 1;
  }
  await t0.save();

  // Solo registrations for tournament 2
  const t1 = tournaments[1];
  for (let i = 8; i < 20; i++) {
    const pay = await PaymentModel.create({
      user: players[i]._id, tournament: t1._id,
      amount: t1.entryFee, currency: 'INR', status: 'captured',
      method: 'upi', razorpayOrderId: `order_seed_s${i}`, razorpayPaymentId: `pay_seed_s${i}`,
      invoiceNumber: `INV-SEED-${2000 + i}`,
    });
    await RegistrationModel.create({
      tournament: t1._id, user: players[i]._id,
      type: 'solo', status: 'confirmed',
      registrationId: `NXS-S-${Date.now()}-${i}`,
      seed: i - 7, confirmedAt: new Date(),
      payment: pay._id,
    });
    t1.participantsCount += 1;
  }
  await t1.save();

  // Generate bracket for tournament 1
  try {
    const seeded = teams.map((team, i) => ({
      ref: String(team._id),
      name: team.name,
      kind: 'team' as const,
      seed: i + 1,
    }));
    const bracket = generateBracket('single_elimination', seeded, { thirdPlace: true });
    const bracketDoc = await BracketModel.create({
      tournament: t0._id,
      type: 'single_elimination',
      bracketSize: bracket.bracketSize,
      hasByes: bracket.hasByes,
      rounds: bracket.rounds.map((r) => ({ number: r.number, name: r.name, stage: r.stage, matches: [] })),
      losersRounds: [],
      generatedAt: new Date(),
      generatedBy: organizer._id,
    });
    for (const m of bracket.matches) {
      const doc = await MatchModel.create({
        tournament: t0._id,
        bracket: bracketDoc._id,
        stage: m.stage === 'group' ? 'group' : m.stage === 'swiss' ? 'swiss' : 'knockout',
        round: m.round,
        roundName: m.roundName,
        matchNumber: m.matchNumber,
        position: m.position,
        groupId: m.groupId ?? '',
        format: m.format ?? 'bo3',
        participant1: {
          kind: m.participant1.kind, ref: m.participant1.ref, name: m.participant1.name, seed: m.participant1.seed,
        },
        participant2: {
          kind: m.participant2.kind, ref: m.participant2.ref, name: m.participant2.name, seed: m.participant2.seed,
        },
        nextMatchNumber: m.nextMatchNumber,
        nextMatchSlot: m.nextMatchSlot,
        isBye: m.isBye,
        isThirdPlace: m.isThirdPlace,
        scheduledAt: new Date(now + 2 * day),
      });
      await BracketModel.updateOne(
        { _id: bracketDoc._id, 'rounds.number': m.round },
        { $push: { 'rounds.$.matches': doc._id } },
      );
    }
    t0.status = 'ongoing';
    t0.bracketGenerated = true;
    await t0.save();
  } catch (e) {
    console.warn('Bracket generation skipped:', (e as Error).message);
  }
  console.log('✅ registrations, payments and bracket');

  // Notifications
  await NotificationModel.create({
    user: admin._id, type: 'generic', title: 'Welcome to NEXUS ARENA',
    body: 'Your platform is ready. Head to the admin panel to configure settings.',
  });
  await NotificationModel.create({
    user: organizer._id, type: 'tournament_created', title: 'Tournament published',
    body: 'Valorant Pro Cup 2026 is live for registrations.',
    data: { tournamentId: String(t0._id) },
  });

  // Audit
  await AdminLogModel.create({
    actor: admin._id, action: 'system:seed', targetType: 'system',
    details: { users: players.length + 2, tournaments: tournaments.length },
  });

  console.log('\n🎉 Seeding complete!');
  console.log('   Admin login:      admin@nexusarena.gg / Password@123');
  console.log('   Organizer login:  organizer@nexusarena.gg / Password@123');
  console.log('   Player logins:    <username>@nexusarena.gg / Password@123');

  if ((process.env.MONGODB_URI ?? '').startsWith('memory')) {
    console.log('\n⚠️  In-memory DB mode: data will vanish when this process exits.');
  }
  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  try { await disconnectDB(); } catch { /* ignore */ }
  process.exit(1);
});
