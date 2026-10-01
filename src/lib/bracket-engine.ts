/**
 * Pure tournament bracket engine.
 *
 * Generates match graphs for every supported format:
 *   single_elimination · double_elimination · round_robin · swiss · group_knockout
 *
 * No database access here — services persist the generated structures.
 */

export interface BracketSlot {
  kind: 'user' | 'team' | 'bye' | 'tbd';
  ref: string | null;
  name: string;
  seed: number;
  logo?: string;
}

export interface GeneratedMatch {
  matchNumber: number;
  round: number;
  roundName: string;
  position: number;
  stage:
    | 'winners'
    | 'losers'
    | 'grand_final'
    | 'grand_final_reset'
    | 'group'
    | 'swiss'
    | 'knockout'
    | 'placement';
  groupId: string;
  format: string;
  participant1: BracketSlot;
  participant2: BracketSlot;
  nextMatchNumber: number;
  nextMatchSlot: number;
  loserNextMatchNumber: number;
  loserNextMatchSlot: number;
  isBye: boolean;
  isThirdPlace: boolean;
  scheduledAt?: Date | null;
}

export interface GeneratedRound {
  number: number;
  name: string;
  stage: string;
  matchNumbers: number[];
}

export interface GeneratedGroup {
  id: string;
  name: string;
  rounds: GeneratedRound[];
}

export interface GeneratedBracket {
  type: string;
  bracketSize: number;
  hasByes: boolean;
  rounds: GeneratedRound[];
  losersRounds: GeneratedRound[];
  groups: GeneratedGroup[];
  matches: GeneratedMatch[];
  seeds: { seed: number; name: string; ref: string | null; kind: string }[];
  totalRounds: number;
}

export interface BracketParticipant {
  ref: string | null;
  name: string;
  kind: 'user' | 'team';
  seed: number;
  logo?: string;
}

const tbd = (seed = 0): BracketSlot => ({ kind: 'tbd', ref: null, name: 'TBD', seed });
const bye = (): BracketSlot => ({ kind: 'bye', ref: null, name: 'BYE', seed: 0 });

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Standard 1-based bracket seeding order (1vS, 2vS-1 …). */
export function seedOrder(size: number): number[] {
  if (size < 2 || (size & (size - 1)) !== 0) throw new Error('Bracket size must be a power of 2');
  let arr = [1];
  while (arr.length < size) {
    const m = arr.length * 2 + 1;
    arr = arr.flatMap((x) => [x, m - x]);
  }
  return arr;
}

/** Seed positions paired in round 1: [[1,S],[S/2+1, ...], …] flattened by seedOrder. */
function firstRoundPairs(size: number): Array<[number, number]> {
  const order = seedOrder(size);
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < order.length; i += 2) {
    pairs.push([order[i]!, order[i + 1]!]);
  }
  return pairs;
}

export function roundNameFor(remainingMatches: number, totalInRound: number, isFinalRound: boolean, type: string): string {
  if (isFinalRound && type !== 'double_elimination') return 'Grand Final';
  switch (remainingMatches) {
    case 1:
      return isFinalRound ? 'Grand Final' : 'Final';
    case 2:
      return 'Semi Finals';
    case 4:
      return 'Quarter Finals';
    case 8:
      return 'Round of 16';
    case 16:
      return 'Round of 32';
    case 32:
      return 'Round of 64';
    case 64:
      return 'Round of 128';
    default:
      return `Round of ${totalInRound * 2}`;
  }
}

function slotFromParticipant(p: BracketParticipant | null): BracketSlot {
  if (!p) return tbd();
  return { kind: p.kind, ref: p.ref, name: p.name, seed: p.seed, logo: p.logo };
}

/**
 * Seeding strategies:
 *  - auto:    strongest seeds occupy seed 1..N (by points/registration order)
 *  - random:  Fisher–Yates shuffle
 *  - manual:  caller supplies the ordered list
 */
export function applySeeding(
  participants: BracketParticipant[],
  method: 'auto' | 'random' | 'manual',
  manualOrder?: string[],
): BracketParticipant[] {
  const list = [...participants];
  if (method === 'random') {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
  } else if (method === 'manual' && manualOrder?.length) {
    const byRef = new Map(list.map((p) => [p.ref ?? p.name, p]));
    const ordered: BracketParticipant[] = [];
    for (const key of manualOrder) {
      const p = byRef.get(key);
      if (p) {
        ordered.push(p);
        byRef.delete(key);
      }
    }
    for (const p of byRef.values()) ordered.push(p);
    return ordered.map((p, i) => ({ ...p, seed: i + 1 }));
  }
  return list.map((p, i) => ({ ...p, seed: i + 1 }));
}

/* ───────────────────────── SINGLE ELIMINATION ───────────────────────── */

export function generateSingleElimination(
  participants: BracketParticipant[],
  opts: { format?: string; thirdPlace?: boolean; startTimes?: Date[] } = {},
): GeneratedBracket {
  const count = participants.length;
  if (count < 2) throw new Error('At least 2 participants are required');
  const bracketSize = nextPowerOfTwo(count);
  const hasByes = bracketSize > count;
  const totalRounds = Math.log2(bracketSize);
  const format = opts.format ?? 'bo3';

  // Map seed → participant (missing seeds become byes).
  const bySeed = new Map<number, BracketParticipant>();
  for (const p of participants) bySeed.set(p.seed, p);

  const matches: GeneratedMatch[] = [];
  const rounds: GeneratedRound[] = [];
  let matchNumber = 1;

  // Pre-create all rounds.
  const roundMeta: { count: number; name: string }[] = [];
  for (let r = 0; r < totalRounds; r++) {
    const countInRound = bracketSize / Math.pow(2, r + 1);
    roundMeta.push({
      count: countInRound,
      name: roundNameFor(countInRound, countInRound, r === totalRounds - 1, 'single_elimination'),
    });
  }

  const firstPairs = firstRoundPairs(bracketSize);
  // Match numbering per round: store ranges.
  const roundFirstNumber: number[] = [];
  let counter = 1;
  for (let r = 0; r < totalRounds; r++) {
    roundFirstNumber.push(counter);
    counter += roundMeta[r]!.count;
  }
  if (opts.thirdPlace && totalRounds >= 2) counter += 1;

  const totalMatches = counter - 1;

  for (let r = 0; r < totalRounds; r++) {
    const meta = roundMeta[r]!;
    const roundMatches: GeneratedMatch[] = [];
    for (let pos = 0; pos < meta.count; pos++) {
      const num = roundFirstNumber[r]! + pos;
      let p1: BracketSlot;
      let p2: BracketSlot;
      if (r === 0) {
        const [s1, s2] = firstPairs[pos]!;
        const a = bySeed.get(s1);
        const b = bySeed.get(s2);
        p1 = slotFromParticipant(a ?? null);
        p2 = slotFromParticipant(b ?? null);
        if (!a) p1 = bye();
        if (!b) p2 = bye();
      } else {
        p1 = tbd();
        p2 = tbd();
      }
      const isLast = r === totalRounds - 1;
      const nextRoundFirst = r + 1 < totalRounds ? roundFirstNumber[r + 1]! : 0;
      const nextNum = !isLast ? nextRoundFirst + Math.floor(pos / 2) : 0;

      const m: GeneratedMatch = {
        matchNumber: num,
        round: r + 1,
        roundName: meta.name,
        position: pos,
        stage: 'knockout',
        groupId: '',
        format: isLast && totalRounds >= 3 ? upgradeFormat(format) : format,
        participant1: p1,
        participant2: p2,
        nextMatchNumber: nextNum,
        nextMatchSlot: pos % 2 === 0 ? 1 : 2,
        loserNextMatchNumber: 0,
        loserNextMatchSlot: 0,
        isBye: p1.kind === 'bye' || p2.kind === 'bye',
        isThirdPlace: false,
        scheduledAt: opts.startTimes?.[r] ?? null,
      };
      matches.push(m);
      roundMatches.push(m);
    }
    rounds.push({ number: r + 1, name: meta.name, stage: 'knockout', matchNumbers: roundMatches.map((m) => m.matchNumber) });
  }

  if (opts.thirdPlace && totalRounds >= 2) {
    const semiNumbers = rounds[totalRounds - 2]!.matchNumbers;
    const thirdPlace: GeneratedMatch = {
      matchNumber: totalMatches,
      round: totalRounds,
      roundName: '3rd Place Match',
      position: 1,
      stage: 'placement',
      groupId: '',
      format,
      participant1: tbd(),
      participant2: tbd(),
      nextMatchNumber: 0,
      nextMatchSlot: 0,
      loserNextMatchNumber: 0,
      loserNextMatchSlot: 0,
      isBye: false,
      isThirdPlace: true,
      scheduledAt: null,
    };
    matches.push(thirdPlace);
    // Losers of semis drop into the 3rd place match.
    for (let i = 0; i < semiNumbers.length; i++) {
      const semi = matches.find((m) => m.matchNumber === semiNumbers[i])!;
      semi.loserNextMatchNumber = thirdPlace.matchNumber;
      semi.loserNextMatchSlot = i + 1;
    }
  }

  return {
    type: 'single_elimination',
    bracketSize,
    hasByes,
    rounds,
    losersRounds: [],
    groups: [],
    matches,
    seeds: participants.map((p) => ({ seed: p.seed, name: p.name, ref: p.ref, kind: p.kind })),
    totalRounds,
  };
}

function upgradeFormat(format: string): string {
  if (format === 'bo1') return 'bo3';
  return format;
}

/* ───────────────────────── DOUBLE ELIMINATION ───────────────────────── */

export function generateDoubleElimination(
  participants: BracketParticipant[],
  opts: { format?: string; grandFinalReset?: boolean } = {},
): GeneratedBracket {
  const count = participants.length;
  if (count < 4) throw new Error('Double elimination requires at least 4 participants');
  const bracketSize = nextPowerOfTwo(count);
  const k = Math.log2(bracketSize);
  const format = opts.format ?? 'bo3';

  // Winners bracket reuses single-elim generator internally.
  const winners = generateSingleElimination(participants, { format, thirdPlace: false });

  const matches: GeneratedMatch[] = winners.matches.map((m) => ({ ...m, stage: m.stage as 'knockout' extends never ? never : 'winners' }));
  // Re-tag winners stages
  for (const m of matches) m.stage = 'winners';

  let matchNumber = matches.length + 1;
  const losersRounds: GeneratedRound[] = [];
  const losersRoundFirstNumber: number[] = [];

  // LB round pairs j = 1..k-1: rounds (2j-1, 2j) each with 2^(k-1-j) matches.
  // For j=1 the counts are 2^(k-2).
  interface LbMatchInfo { num: number; roundIdx: number }
  const lbMatchNumbers: number[][] = []; // per LB round

  for (let j = 1; j <= k - 1; j++) {
    const matchCount = Math.pow(2, k - 1 - j);
    for (const rr of [2 * j - 1, 2 * j]) {
      losersRoundFirstNumber.push(matchNumber);
      const nums: number[] = [];
      for (let pos = 0; pos < matchCount; pos++) {
        nums.push(matchNumber++);
      }
      lbMatchNumbers.push(nums);
    }
  }

  // Build LB match objects.
  let lbRoundIndex = 0;
  for (let j = 1; j <= k - 1; j++) {
    for (const rr of [2 * j - 1, 2 * j]) {
      const nums = lbMatchNumbers[lbRoundIndex]!;
      const isDropIn = j === 1 && rr === 1;
      const isFinalLb = j === k - 1 && rr === 2;
      const name = isFinalLb
        ? 'Losers Final'
        : rr % 2 === 1
          ? `Losers Round ${j}`
          : `Losers Round ${j}b`;
      for (let pos = 0; pos < nums.length; pos++) {
        const num = nums[pos]!;
        // Winner path: LB winners advance within LB; LB final winner → GF.
        let nextNum = 0;
        let nextSlot = 0;
        let loserNextNum = 0;
        let loserNextSlot = 0;

        if (!isFinalLb) {
          const nextLbRound = lbMatchNumbers[lbRoundIndex + 1];
          if (nextLbRound) {
            if (rr === 2 * j - 1 && j >= 2) {
              // major round: winners pair within the same next round (even round)
              nextNum = nextLbRound[Math.floor(pos / 2)]!;
              nextSlot = pos % 2 === 0 ? 1 : 2;
            } else if (rr === 2 * j - 1 && j === 1) {
              // LB1 winners feed LB2 evenly
              nextNum = nextLbRound[Math.floor(pos / 2)]!;
              nextSlot = pos % 2 === 0 ? 1 : 2;
            } else {
              // even round (drop-in round): winners feed the next odd round 1:1
              nextNum = nextLbRound[pos]!;
              nextSlot = 1;
            }
          }
        }

        const m: GeneratedMatch = {
          matchNumber: num,
          round: rr,
          roundName: name,
          position: pos,
          stage: 'losers',
          groupId: '',
          format: isFinalLb ? upgradeFormat(format) : format === 'bo5' ? 'bo3' : format,
          participant1: isDropIn ? tbd() : tbd(),
          participant2: tbd(),
          nextMatchNumber: nextNum,
          nextMatchSlot: nextSlot,
          loserNextMatchNumber: loserNextNum,
          loserNextMatchSlot: loserNextSlot,
          isBye: false,
          isThirdPlace: false,
          scheduledAt: null,
        };
        matches.push(m);
      }
      losersRounds.push({
        number: rr,
        name,
        stage: 'losers',
        matchNumbers: [...nums],
      });
      lbRoundIndex++;
    }
  }

  // Grand final.
  const winnersFinal = winners.matches[winners.matches.length - 1]!;
  const lastLbNumbers = lbMatchNumbers[lbMatchNumbers.length - 1]!;
  const losersFinalNum = lastLbNumbers[0]!;

  const gfNum = matchNumber++;
  const grandFinal: GeneratedMatch = {
    matchNumber: gfNum,
    round: k + 1,
    roundName: 'Grand Final',
    position: 0,
    stage: 'grand_final',
    groupId: '',
    format: format === 'bo1' ? 'bo5' : 'bo5',
    participant1: tbd(),
    participant2: tbd(),
    nextMatchNumber: 0,
    nextMatchSlot: 0,
    loserNextMatchNumber: 0,
    loserNextMatchSlot: 0,
    isBye: false,
    isThirdPlace: false,
    scheduledAt: null,
  };
  matches.push(grandFinal);

  winnersFinal.nextMatchNumber = gfNum;
  winnersFinal.nextMatchSlot = 1;

  const losersFinal = matches.find((m) => m.matchNumber === losersFinalNum)!;
  losersFinal.nextMatchNumber = gfNum;
  losersFinal.nextMatchSlot = 2;

  // Wire WB losers into LB drop-in slots.
  // WB round r (1-indexed) losers drop into:
  //   r=1 → LB round 1 (both slots, sequential)
  //   r=2 → LB round 2 (slot 2)
  //   r>=3 → LB round 2(r-1) (slot 2)
  for (const m of matches.filter((x) => x.stage === 'winners')) {
    const r = m.round;
    let targetRound = 0;
    let slot = 2;
    if (r === 1) {
      targetRound = 1;
      slot = 0; // sequential fill handled below
    } else if (r === 2) {
      targetRound = 2;
      slot = 2;
    } else if (r <= k) {
      targetRound = 2 * (r - 1);
      slot = 2;
    }
    const targetNums = lbMatchNumbers[targetRound - 1];
    if (!targetNums) continue;
    if (slot === 0) {
      // WB R1 losers: match i (0-based among 2^(k-1) WB matches) feeds
      // LB match floor(i/2) at slot (i%2 === 0 ? 2 : ... ) — actually 8 losers → 4 matches:
      // WB m1.loser → LB1 slot1? Standard: losers of WB matches (2i, 2i+1) meet in LB match i.
      // WB matches in round 1 numbered roundFirstNumber..+count-1.
      const roundMatches = matches.filter((x) => x.stage === 'winners' && x.round === 1).sort((a, b) => a.position - b.position);
      const idx = roundMatches.findIndex((x) => x.matchNumber === m.matchNumber);
      const targetPos = Math.floor(idx / 2);
      const target = matches.find((x) => x.matchNumber === targetNums[targetPos]);
      if (target) {
        if (idx % 2 === 0) {
          m.loserNextMatchNumber = target.matchNumber;
          m.loserNextMatchSlot = 1;
        } else {
          m.loserNextMatchNumber = target.matchNumber;
          m.loserNextMatchSlot = 2;
        }
      }
    } else {
      // drop-in at slot 2 of the paired LB match
      const targetPos = m.position;
      const target = matches.find((x) => x.matchNumber === targetNums[targetPos]);
      if (target) {
        m.loserNextMatchNumber = target.matchNumber;
        m.loserNextMatchSlot = 2;
      }
    }
  }

  const rounds = winners.rounds.map((r) => ({ ...r, stage: 'winners' }));

  return {
    type: 'double_elimination',
    bracketSize,
    hasByes: bracketSize > count,
    rounds,
    losersRounds,
    groups: [],
    matches,
    seeds: participants.map((p) => ({ seed: p.seed, name: p.name, ref: p.ref, kind: p.kind })),
    totalRounds: k,
  };
}

/* ────────────────────────── ROUND ROBIN ─────────────────────────────── */

/** Circle-method round robin: everyone plays everyone once. */
export function generateRoundRobin(
  participants: BracketParticipant[],
  opts: { format?: string; double?: boolean; groupId?: string; groupName?: string } = {},
): { rounds: GeneratedRound[]; matches: GeneratedMatch[] } {
  const n = participants.length;
  if (n < 2) throw new Error('At least 2 participants are required');
  const format = opts.format ?? 'bo1';
  const players: (BracketParticipant | null)[] = [...participants];
  if (n % 2 === 1) players.push(null); // bye
  const m = players.length;
  const roundsCount = m - 1;
  const half = m / 2;

  const matches: GeneratedMatch[] = [];
  const rounds: GeneratedRound[] = [];
  let matchNumber = 1;

  const fixed = players[0]!;
  let rotating = players.slice(1);

  for (let r = 0; r < roundsCount; r++) {
    const roundMatches: GeneratedMatch[] = [];
    const pairings: [BracketParticipant | null, BracketParticipant | null][] = [];
    pairings.push([fixed, rotating[0]!]);
    for (let i = 1; i < half; i++) {
      pairings.push([rotating[i]!, rotating[m - 2 - i]!]);
    }
    for (let pos = 0; pos < pairings.length; pos++) {
      const [a, b] = pairings[pos]!;
      if (!a || !b) continue; // pairing with bye → skip match
      const gen: GeneratedMatch = {
        matchNumber: matchNumber,
        round: r + 1,
        roundName: `Round ${r + 1}`,
        position: pos,
        stage: opts.groupId ? 'group' : 'placement',
        groupId: opts.groupId ?? '',
        format,
        participant1: slotFromParticipant(a),
        participant2: slotFromParticipant(b),
        nextMatchNumber: 0,
        nextMatchSlot: 0,
        loserNextMatchNumber: 0,
        loserNextMatchSlot: 0,
        isBye: false,
        isThirdPlace: false,
        scheduledAt: null,
      };
      matches.push(gen);
      roundMatches.push(gen);
      matchNumber++;
    }
    rounds.push({
      number: r + 1,
      name: opts.groupName ? `${opts.groupName} · Round ${r + 1}` : `Round ${r + 1}`,
      stage: opts.groupId ? 'group' : 'placement',
      matchNumbers: roundMatches.map((mm) => mm.matchNumber),
    });
    rotating = [rotating[m - 2]!, ...rotating.slice(0, m - 2)];
  }

  return { rounds, matches };
}

/* ────────────────────────────── SWISS ───────────────────────────────── */

export const SWISS_POINTS = { win: 3, draw: 1, loss: 0 };

export function recommendedSwissRounds(participantCount: number): number {
  return Math.max(3, Math.ceil(Math.log2(Math.max(2, participantCount))));
}

export interface SwissStanding {
  ref: string | null;
  name: string;
  seed: number;
  points: number;
  buchholz: number;
  opponents: number[]; // seeds
  wins: number;
  losses: number;
  draws: number;
}

/**
 * Swiss pairing for the next round.
 * Groups by score, greedy pairing inside groups with bye handling,
 * avoids rematches where possible.
 */
export function pairSwissRound(
  standings: SwissStanding[],
  round: number,
): Array<[SwissStanding, SwissStanding | null]> {
  const sorted = [...standings].sort(
    (a, b) => b.points - a.points || b.buchholz - a.buchholz || a.seed - b.seed,
  );
  const used = new Set<number>();
  const pairs: Array<[SwissStanding, SwissStanding | null]> = [];

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    const a = sorted[i]!;
    let partnerIdx = -1;
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      const b = sorted[j]!;
      if (a.opponents.includes(b.seed)) continue;
      partnerIdx = j;
      break;
    }
    if (partnerIdx === -1) {
      // rematch unavoidable or odd man out
      for (let j = i + 1; j < sorted.length; j++) {
        if (!used.has(j)) {
          partnerIdx = j;
          break;
        }
      }
    }
    if (partnerIdx === -1) {
      pairs.push([a, null]); // bye
    } else {
      used.add(partnerIdx);
      pairs.push([a, sorted[partnerIdx]!]);
    }
    used.add(i);
  }
  return pairs;
}

export function generateSwissRoundMatches(
  pairs: Array<[SwissStanding, SwissStanding | null]>,
  round: number,
  matchNumberStart: number,
  format = 'bo3',
): GeneratedMatch[] {
  let matchNumber = matchNumberStart;
  return pairs.map(([a, b], pos) => {
    const m: GeneratedMatch = {
      matchNumber: matchNumber++,
      round,
      roundName: `Swiss Round ${round}`,
      position: pos,
      stage: 'swiss',
      groupId: '',
      format,
      participant1: {
        kind: a.ref ? 'user' : 'tbd',
        ref: a.ref,
        name: a.name,
        seed: a.seed,
      },
      participant2: b
        ? { kind: b.ref ? 'user' : 'tbd', ref: b.ref, name: b.name, seed: b.seed }
        : bye(),
      nextMatchNumber: 0,
      nextMatchSlot: 0,
      loserNextMatchNumber: 0,
      loserNextMatchSlot: 0,
      isBye: !b,
      isThirdPlace: false,
      scheduledAt: null,
    };
    return m;
  });
}

/* ─────────────────────── GROUP STAGE + KNOCKOUT ─────────────────────── */

export function generateGroupKnockout(
  participants: BracketParticipant[],
  opts: { format?: string; groupSize?: number; advancePerGroup?: number } = {},
): GeneratedBracket {
  const count = participants.length;
  if (count < 8) throw new Error('Group + Knockout requires at least 8 participants');
  const format = opts.format ?? 'bo1';
  const groupSize = opts.groupSize ?? 4;
  const advancePerGroup = opts.advancePerGroup ?? 2;

  const groupCount = Math.ceil(count / groupSize);
  const groups: GeneratedGroup[] = [];
  const matches: GeneratedMatch[] = [];
  let matchNumber = 1;

  // Snake-distribute seeds across groups.
  const seeded = [...participants].sort((a, b) => a.seed - b.seed);
  const buckets: BracketParticipant[][] = Array.from({ length: groupCount }, () => []);
  let dir = 1;
  let g = 0;
  for (const p of seeded) {
    buckets[g]!.push(p);
    g += dir;
    if (g >= groupCount) {
      g = groupCount - 1;
      dir = -1;
    } else if (g < 0) {
      g = 0;
      dir = 1;
    }
  }

  for (let i = 0; i < groupCount; i++) {
    const gid = String.fromCharCode(65 + i); // A, B, C …
    const rr = generateRoundRobin(buckets[i]!, {
      format,
      groupId: gid,
      groupName: `Group ${gid}`,
    });
    // renumber matches continuously
    const roundView: GeneratedRound[] = rr.rounds.map((r) => ({
      ...r,
      matchNumbers: [],
    }));
    for (const m of rr.matches) {
      m.matchNumber = matchNumber++;
      m.stage = 'group';
      m.groupId = gid;
      matches.push(m);
      const rv = roundView[m.round - 1]!;
      rv.matchNumbers.push(m.matchNumber);
    }
    groups.push({ id: gid, name: `Group ${gid}`, rounds: roundView });
  }

  // Knockout bracket sized to next power of two of advancing players.
  const advancingCount = groupCount * advancePerGroup;
  const koSize = nextPowerOfTwo(advancingCount);
  const koRounds = Math.log2(koSize);
  const koMatches: GeneratedMatch[] = [];
  const koRoundsView: GeneratedRound[] = [];
  const koFirstNumber: number[] = [];
  let koNum = matchNumber;
  for (let r = 0; r < koRounds; r++) {
    koFirstNumber.push(koNum);
    koNum += koSize / Math.pow(2, r + 1);
  }
  for (let r = 0; r < koRounds; r++) {
    const cnt = koSize / Math.pow(2, r + 1);
    const isFinal = r === koRounds - 1;
    const name = roundNameFor(cnt, cnt, isFinal, 'single_elimination');
    const nums: number[] = [];
    for (let pos = 0; pos < cnt; pos++) {
      const num = koFirstNumber[r]! + pos;
      nums.push(num);
      const isLast = r === koRounds - 1;
      koMatches.push({
        matchNumber: num,
        round: r + 1,
        roundName: name,
        position: pos,
        stage: 'knockout',
        groupId: '',
        format: isLast ? upgradeFormat(format) : format === 'bo5' ? 'bo3' : format,
        participant1: r === 0 ? tbd() : tbd(),
        participant2: tbd(),
        nextMatchNumber: !isLast ? koFirstNumber[r + 1]! + Math.floor(pos / 2) : 0,
        nextMatchSlot: pos % 2 === 0 ? 1 : 2,
        loserNextMatchNumber: 0,
        loserNextMatchSlot: 0,
        isBye: false,
        isThirdPlace: false,
        scheduledAt: null,
      });
    }
    koRoundsView.push({ number: r + 1, name, stage: 'knockout', matchNumbers: nums });
  }

  matches.push(...koMatches);
  matchNumber = koNum;

  return {
    type: 'group_knockout',
    bracketSize: koSize,
    hasByes: koSize > advancingCount,
    rounds: koRoundsView,
    losersRounds: [],
    groups,
    matches,
    seeds: participants.map((p) => ({ seed: p.seed, name: p.name, ref: p.ref, kind: p.kind })),
    totalRounds: koRounds,
  };
}

/* ─────────────────────────── ENTRY POINT ───────────────────────────── */

export function generateBracket(
  format: string,
  participants: BracketParticipant[],
  opts: {
    thirdPlace?: boolean;
    seeding?: 'auto' | 'random' | 'manual';
    manualOrder?: string[];
    matchFormat?: string;
    swissRounds?: number;
    groupSize?: number;
    advancePerGroup?: number;
    startTimes?: Date[];
  } = {},
): GeneratedBracket {
  const ordered = applySeeding(participants, opts.seeding ?? 'auto', opts.manualOrder);
  const matchFormat = opts.matchFormat ?? 'bo3';

  switch (format) {
    case 'double_elimination':
      return generateDoubleElimination(ordered, { format: matchFormat });
    case 'round_robin': {
      const rr = generateRoundRobin(ordered, { format: matchFormat });
      return {
        type: 'round_robin',
        bracketSize: ordered.length,
        hasByes: false,
        rounds: rr.rounds,
        losersRounds: [],
        groups: [],
        matches: rr.matches,
        seeds: ordered.map((p) => ({ seed: p.seed, name: p.name, ref: p.ref, kind: p.kind })),
        totalRounds: rr.rounds.length,
      };
    }
    case 'swiss': {
      const roundsCount = opts.swissRounds ?? recommendedSwissRounds(ordered.length);
      const standings: SwissStanding[] = ordered.map((p) => ({
        ref: p.ref,
        name: p.name,
        seed: p.seed,
        points: 0,
        buchholz: 0,
        opponents: [],
        wins: 0,
        losses: 0,
        draws: 0,
      }));
      const pairs = pairSwissRound(standings, 1);
      const matches = generateSwissRoundMatches(pairs, 1, 1, matchFormat);
      return {
        type: 'swiss',
        bracketSize: ordered.length,
        hasByes: ordered.length % 2 === 1,
        rounds: [
          {
            number: 1,
            name: 'Swiss Round 1',
            stage: 'swiss',
            matchNumbers: matches.map((m) => m.matchNumber),
          },
        ],
        losersRounds: [],
        groups: [],
        matches,
        seeds: ordered.map((p) => ({ seed: p.seed, name: p.name, ref: p.ref, kind: p.kind })),
        totalRounds: roundsCount,
      };
    }
    case 'group_knockout':
      return generateGroupKnockout(ordered, {
        format: matchFormat,
        groupSize: opts.groupSize,
        advancePerGroup: opts.advancePerGroup,
      });
    case 'single_elimination':
    case 'custom':
    default:
      return generateSingleElimination(ordered, {
        format: matchFormat,
        thirdPlace: opts.thirdPlace,
        startTimes: opts.startTimes,
      });
  }
}
