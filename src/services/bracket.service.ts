import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import {
  BracketModel,
  MatchModel,
  RegistrationModel,
  TeamModel,
  TournamentModel,
  type MatchDoc,
} from '@/models';
import type { BracketView, BracketMatchNode, BracketRoundView } from '@/types';
import {
  generateBracket,
  generateSwissRoundMatches,
  pairSwissRound,
  type BracketParticipant,
  type GeneratedBracket,
  type SwissStanding,
} from '@/lib/bracket-engine';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { realtime } from '@/lib/realtime';

/** Collect confirmed registrants as bracket participants. */
export async function collectParticipants(tournamentId: string): Promise<BracketParticipant[]> {
  await connectDB();
  const tournament = await TournamentModel.findById(tournamentId).lean();
  if (!tournament) throw new NotFoundError('Tournament not found');

  const regs = await RegistrationModel.find({
    tournament: tournamentId,
    status: 'confirmed',
  })
    .sort({ seed: 1, createdAt: 1 })
    .populate('user', 'name username avatar playerId')
    .populate('team', 'name tag logo')
    .lean();

  return regs.map((r: any, i: number) => {
    if (tournament.type === 'team' && r.team) {
      return {
        ref: String(r.team._id),
        name: r.team.name ?? r.team.tag ?? 'Team',
        kind: 'team' as const,
        seed: r.seed || i + 1,
        logo: r.team.logo ?? '',
      };
    }
    return {
      ref: String(r.user?._id ?? r.user),
      name: r.user?.name ?? 'Player',
      kind: 'user' as const,
      seed: r.seed || i + 1,
      logo: r.user?.avatar ?? '',
    };
  });
}

/** Persist a generated bracket + its matches to the database. */
export async function persistBracket(
  tournamentId: string,
  generated: GeneratedBracket,
  generatedBy: string,
) {
  await connectDB();
  // Remove any previous bracket/matches (regeneration support).
  await MatchModel.deleteMany({ tournament: tournamentId });
  await BracketModel.deleteOne({ tournament: tournamentId });

  const inserted = await MatchModel.insertMany(
    generated.matches.map((m) => ({
      tournament: tournamentId,
      matchNumber: m.matchNumber,
      round: m.round,
      roundName: m.roundName,
      position: m.position,
      stage: m.stage,
      groupId: m.groupId,
      format: m.format,
      participant1: {
        kind: m.participant1.kind,
        ref: m.participant1.ref ? new Types.ObjectId(m.participant1.ref) : null,
        name: m.participant1.name,
        seed: m.participant1.seed,
        score: 0,
        logo: m.participant1.logo ?? '',
      },
      participant2: {
        kind: m.participant2.kind,
        ref: m.participant2.ref ? new Types.ObjectId(m.participant2.ref) : null,
        name: m.participant2.name,
        seed: m.participant2.seed,
        score: 0,
        logo: m.participant2.logo ?? '',
      },
      status: m.isBye ? 'completed' : m.participant1.kind !== 'tbd' && m.participant2.kind !== 'tbd' ? 'scheduled' : 'pending',
      nextMatchNumber: m.nextMatchNumber,
      nextMatchSlot: m.nextMatchSlot,
      loserNextMatchNumber: m.loserNextMatchNumber,
      loserNextMatchSlot: m.loserNextMatchSlot,
      isBye: m.isBye,
      isThirdPlace: m.isThirdPlace,
      scheduledAt: m.scheduledAt ?? undefined,
    })),
  );

  const byNumber = new Map<number, MatchDoc>();
  for (const doc of inserted) byNumber.set(doc.matchNumber, doc as unknown as MatchDoc);

  // Auto-resolve byes immediately.
  for (const m of generated.matches) {
    if (!m.isBye) continue;
    const doc = byNumber.get(m.matchNumber)!;
    const p1Bye = m.participant1.kind === 'bye';
    const winnerSlot = p1Bye ? 2 : 1;
    await resolveWinnerSlots(doc, winnerSlot, byNumber);
  }

  const bracket = await BracketModel.create({
    tournament: tournamentId,
    type: generated.type,
    bracketSize: generated.bracketSize,
    hasByes: generated.hasByes,
    seedingMethod: generated.seeds.length ? 'auto' : 'auto',
    rounds: generated.rounds.map((r) => ({
      number: r.number,
      name: r.name,
      stage: r.stage,
      matches: r.matchNumbers.map((n) => byNumber.get(n)?._id).filter(Boolean),
    })),
    losersRounds: generated.losersRounds.map((r) => ({
      number: r.number,
      name: r.name,
      stage: r.stage,
      matches: r.matchNumbers.map((n) => byNumber.get(n)?._id).filter(Boolean),
    })),
    groups: generated.groups.map((g) => ({
      id: g.id,
      name: g.name,
      rounds: g.rounds.map((r) => ({
        number: r.number,
        name: r.name,
        stage: r.stage,
        matches: r.matchNumbers.map((n) => byNumber.get(n)?._id).filter(Boolean),
      })),
    })),
    generatedAt: new Date(),
    generatedBy: new Types.ObjectId(generatedBy),
    version: 1,
    seeds: generated.seeds.map((s) => ({
      seed: s.seed,
      name: s.name,
      ref: s.ref ? new Types.ObjectId(s.ref) : null,
      kind: s.kind,
    })),
  });

  await TournamentModel.findByIdAndUpdate(tournamentId, {
    totalRounds: generated.totalRounds,
    currentRound: 1,
    'stats.totalMatches': generated.matches.filter((m) => !m.isBye).length,
    'stats.completedMatches': generated.matches.filter((m) => m.isBye).length,
  });

  return bracket;
}

/** Generate + persist the full bracket for a tournament. */
export async function generateTournamentBracket(
  tournamentId: string,
  options: { seeding?: 'auto' | 'random' | 'manual'; manualOrder?: string[]; generatedBy: string },
) {
  await connectDB();
  const tournament = await TournamentModel.findById(tournamentId);
  if (!tournament) throw new NotFoundError('Tournament not found');
  if (tournament.status === 'completed' || tournament.status === 'cancelled') {
    throw new ConflictError(`Cannot generate bracket for a ${tournament.status} tournament.`);
  }

  const participants = await collectParticipants(tournamentId);
  const min = tournament.minParticipants ?? 2;
  if (participants.length < min) {
    throw new ValidationError(
      `Need at least ${min} confirmed participants to generate a bracket (have ${participants.length}).`,
    );
  }
  if (tournament.format === 'double_elimination' && participants.length < 4) {
    throw new ValidationError('Double elimination requires at least 4 participants.');
  }

  const generated = generateBracket(tournament.format, participants, {
    thirdPlace: tournament.settings?.thirdPlaceMatch ?? true,
    seeding: options.seeding ?? (tournament.seeding as 'auto' | 'random' | 'manual') ?? 'auto',
    manualOrder: options.manualOrder,
    matchFormat: `bo${tournament.settings?.bestOfDefault ?? 3}` as 'bo1' | 'bo3' | 'bo5',
  });

  const bracket = await persistBracket(tournamentId, generated, options.generatedBy);

  if (tournament.status === 'registration' || tournament.status === 'upcoming') {
    await TournamentModel.findByIdAndUpdate(tournamentId, { status: 'ongoing' });
  }

  realtime.tournament(tournamentId, 'bracket:generated', {
    tournamentId,
    matches: generated.matches.length,
    format: generated.type,
  });

  return bracket;
}

/** Place a participant into a slot of a match; schedule it when both slots are filled. */
export async function placeIntoMatch(
  matchNumber: number,
  tournamentId: string,
  slot: 1 | 2,
  participant: { kind: 'user' | 'team' | 'bye' | 'tbd'; ref: string | null; name: string; seed?: number; logo?: string },
  byNumber?: Map<number, MatchDoc>,
) {
  await connectDB();
  const match = byNumber?.get(matchNumber) ?? (await MatchModel.findOne({ tournament: tournamentId, matchNumber }));
  if (!match) return null;
  const key = slot === 1 ? 'participant1' : 'participant2';
  (match as any)[key] = {
    kind: participant.kind,
    ref: participant.ref ? new Types.ObjectId(participant.ref) : null,
    name: participant.name,
    seed: participant.seed ?? 0,
    score: 0,
    logo: participant.logo ?? '',
  };
  // If opponent is a bye, auto-advance.
  const other = slot === 1 ? match.participant2 : match.participant1;
  if (other && other.kind === 'bye') {
    match.status = 'completed';
  } else if (match.participant1.kind !== 'tbd' && match.participant2.kind !== 'tbd') {
    if (match.status === 'pending') match.status = 'scheduled';
  }
  await match.save();
  return match;
}

/** Internal: mark a match winner (used for byes and results) and advance. */
export async function resolveWinnerSlots(
  match: MatchDoc,
  winnerSlot: 1 | 2,
  byNumber?: Map<number, MatchDoc>,
) {
  await connectDB();
  const winnerPart = winnerSlot === 1 ? match.participant1 : match.participant2;
  const loserPart = winnerSlot === 1 ? match.participant2 : match.participant1;

  match.winner = {
    kind: winnerPart.kind === 'team' ? 'team' : 'user',
    ref: (winnerPart.ref as any) ?? null,
    name: winnerPart.name,
  };
  match.loser = {
    kind: loserPart.kind === 'team' ? 'team' : 'user',
    ref: (loserPart.ref as any) ?? null,
    name: loserPart.name,
  };
  match.status = match.isBye ? 'completed' : match.status;
  if (!match.isBye) {
    match.completedAt = new Date();
    match.status = 'completed';
  }
  await match.save();

  // Winner advances.
  if (match.nextMatchNumber > 0) {
    await placeIntoMatch(
      match.nextMatchNumber,
      String(match.tournament),
      (match.nextMatchSlot as 1 | 2) || 1,
      {
        kind: winnerPart.kind === 'bye' ? 'tbd' : winnerPart.kind,
        ref: winnerPart.ref ? String(winnerPart.ref) : null,
        name: winnerPart.name,
        seed: winnerPart.seed,
        logo: winnerPart.logo,
      },
      byNumber,
    );
  }
  // Loser drops into losers-bracket path (double elim / 3rd place).
  if (match.loserNextMatchNumber > 0 && (loserPart.kind as string) !== 'bye') {
    await placeIntoMatch(
      match.loserNextMatchNumber,
      String(match.tournament),
      (match.loserNextMatchSlot as 1 | 2) || 1,
      {
        kind: loserPart.kind === 'bye' ? 'tbd' : loserPart.kind,
        ref: loserPart.ref ? String(loserPart.ref) : null,
        name: loserPart.name,
        seed: loserPart.seed,
        logo: loserPart.logo,
      },
      byNumber,
    );
  }
  return match;
}

/** Load bracket as a serialisable view for the UI. */
export async function getBracketView(tournamentId: string): Promise<BracketView | null> {
  await connectDB();
  const bracket = await BracketModel.findOne({ tournament: tournamentId }).lean();
  if (!bracket) return null;
  const matches = await MatchModel.find({ tournament: tournamentId })
    .sort({ round: 1, position: 1, matchNumber: 1 })
    .lean();

  const toNode = (m: any): BracketMatchNode => ({
    matchNumber: m.matchNumber,
    round: m.round,
    roundName: m.roundName,
    position: m.position,
    stage: m.stage,
    format: m.format,
    status: m.status,
    scheduledAt: m.scheduledAt ?? null,
    participant1: {
      kind: m.participant1?.kind ?? 'tbd',
      name: m.participant1?.name ?? 'TBD',
      score: m.participant1?.score ?? 0,
      seed: m.participant1?.seed,
      logo: m.participant1?.logo,
    },
    participant2: {
      kind: m.participant2?.kind ?? 'tbd',
      name: m.participant2?.name ?? 'TBD',
      score: m.participant2?.score ?? 0,
      seed: m.participant2?.seed,
      logo: m.participant2?.logo,
    },
    winner: { kind: m.winner?.kind ?? 'none', name: m.winner?.name ?? '' },
    nextMatchNumber: m.nextMatchNumber ?? 0,
    nextMatchSlot: m.nextMatchSlot ?? 0,
    loserNextMatchNumber: m.loserNextMatchNumber ?? 0,
    loserNextMatchSlot: m.loserNextMatchSlot ?? 0,
    isBye: m.isBye ?? false,
    isThirdPlace: m.isThirdPlace ?? false,
    lobbyCode: m.lobbyCode ?? '',
    streamUrl: m.streamUrl ?? '',
  });

  const byNumber = new Map<number, any>();
  for (const m of matches) byNumber.set(m.matchNumber, m);

  const buildRounds = (rounds: any[]): BracketRoundView[] =>
    (rounds ?? []).map((r: any) => ({
      number: r.number,
      name: r.name,
      stage: r.stage,
      matches: (r.matches ?? [])
        .map((id: any) => matches.find((m: any) => String(m._id) === String(id)))
        .filter(Boolean)
        .map(toNode),
    }));

  return {
    tournament: String(bracket.tournament),
    type: bracket.type,
    bracketSize: bracket.bracketSize,
    hasByes: bracket.hasByes,
    rounds: buildRounds(bracket.rounds),
    losersRounds: buildRounds(bracket.losersRounds),
    groups: (bracket.groups ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      rounds: buildRounds(g.rounds),
    })),
    seeds: (bracket.seeds ?? []).map((s: any) => ({ seed: s.seed, name: s.name })),
    generatedAt: bracket.generatedAt ? new Date(bracket.generatedAt).toISOString() : undefined,
  };
}

/** Compute round-robin / group standings from completed matches. */
export interface StandingRow {
  ref: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  scoreFor: number;
  scoreAgainst: number;
  form: string[];
}

export function computeStandings(
  matches: { participant1: any; participant2: any; status: string; winner: any }[],
): StandingRow[] {
  const table = new Map<string, StandingRow>();
  const ensure = (p: any): StandingRow => {
    const key = String(p?.ref ?? p?.name);
    if (!table.has(key)) {
      table.set(key, {
        ref: key,
        name: p?.name ?? 'Unknown',
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        scoreFor: 0,
        scoreAgainst: 0,
        form: [],
      });
    }
    return table.get(key)!;
  };

  for (const m of matches) {
    if (!['completed', 'walkover'].includes(m.status) || m.participant1?.kind === 'bye' || m.participant2?.kind === 'bye')
      continue;
    if (m.participant1?.kind === 'tbd' || m.participant2?.kind === 'tbd') continue;
    const a = ensure(m.participant1);
    const b = ensure(m.participant2);
    a.played++;
    b.played++;
    const sa = m.participant1.score ?? 0;
    const sb = m.participant2.score ?? 0;
    a.scoreFor += sa;
    a.scoreAgainst += sb;
    b.scoreFor += sb;
    b.scoreAgainst += sa;
    if (sa === sb) {
      a.draws++;
      b.draws++;
      a.points += 1;
      b.points += 1;
      a.form.push('D');
      b.form.push('D');
    } else if (sa > sb) {
      a.wins++;
      b.losses++;
      a.points += 3;
      a.form.push('W');
      b.form.push('L');
    } else {
      b.wins++;
      a.losses++;
      b.points += 3;
      b.form.push('W');
      a.form.push('L');
    }
  }

  return [...table.values()].sort(
    (x, y) => y.points - x.points || y.scoreFor - y.scoreAgainst - (x.scoreFor - x.scoreAgainst) || x.losses - y.losses,
  );
}

/** Generate the next swiss round after the current one completes. */
export async function generateNextSwissRound(tournamentId: string): Promise<boolean> {
  await connectDB();
  const tournament = await TournamentModel.findById(tournamentId);
  if (!tournament || tournament.format !== 'swiss') return false;

  const matches = await MatchModel.find({ tournament: tournamentId, stage: 'swiss' }).lean();
  const currentRound = Math.max(...matches.map((m) => m.round), 0);
  const current = matches.filter((m) => m.round === currentRound);
  if (current.some((m) => m.status !== 'completed' && m.status !== 'walkover')) return false;

  const maxRounds = tournament.totalRounds || 5;
  if (currentRound >= maxRounds) return false;

  // Build standings.
  const table = new Map<string, SwissStanding>();
  for (const m of matches.filter((x) => x.status === 'completed' || x.status === 'walkover')) {
    const ensure = (p: any, seedFallback: number): SwissStanding => {
      const key = String(p?.ref ?? p?.name);
      if (!table.has(key)) {
        table.set(key, {
          ref: p?.ref ? String(p.ref) : null,
          name: p?.name ?? 'Player',
          seed: p?.seed || seedFallback,
          points: 0,
          buchholz: 0,
          opponents: [],
          wins: 0,
          losses: 0,
          draws: 0,
        });
      }
      return table.get(key)!;
    };
    const a = ensure(m.participant1, 1);
    const b = ensure(m.participant2, 2);
    if (m.participant2?.kind === 'bye') {
      a.points += 3;
      a.wins++;
      continue;
    }
    if (m.participant1?.kind === 'bye') {
      b.points += 3;
      b.wins++;
      continue;
    }
    a.opponents.push(b.seed);
    b.opponents.push(a.seed);
    const sa = m.participant1?.score ?? 0;
    const sb = m.participant2?.score ?? 0;
    if (sa === sb) {
      a.points++;
      b.points++;
      a.draws++;
      b.draws++;
    } else if (sa > sb) {
      a.points += 3;
      a.wins++;
      b.losses++;
    } else {
      b.points += 3;
      b.wins++;
      a.losses++;
    }
  }
  for (const s of table.values()) {
    s.buchholz = s.opponents.reduce((acc, seed) => {
      const opp = [...table.values()].find((t) => t.seed === seed);
      return acc + (opp?.points ?? 0);
    }, 0);
  }

  const standings = [...table.values()];
  const pairs = pairSwissRound(standings, currentRound + 1);
  const maxMatchNumber = Math.max(...matches.map((m) => m.matchNumber), 0);
  const newMatches = generateSwissRoundMatches(pairs, currentRound + 1, maxMatchNumber + 1, 'bo3');

  const inserted = await MatchModel.insertMany(
    newMatches.map((m) => ({
      tournament: tournamentId,
      matchNumber: m.matchNumber,
      round: m.round,
      roundName: m.roundName,
      position: m.position,
      stage: 'swiss',
      format: m.format,
      participant1: {
        kind: m.participant1.ref ? 'user' : m.participant1.kind,
        ref: m.participant1.ref ? new Types.ObjectId(m.participant1.ref) : null,
        name: m.participant1.name,
        seed: m.participant1.seed,
        score: 0,
      },
      participant2: {
        kind: m.participant2.ref ? 'user' : m.participant2.kind,
        ref: m.participant2.ref ? new Types.ObjectId(m.participant2.ref) : null,
        name: m.participant2.name,
        seed: m.participant2.seed,
        score: 0,
      },
      status: m.isBye ? 'completed' : 'scheduled',
      isBye: m.isBye,
      nextMatchNumber: 0,
      nextMatchSlot: 0,
    })),
  );

  // Resolve byes in the new round.
  for (const doc of inserted as unknown as MatchDoc[]) {
    if (doc.isBye) {
      const winnerSlot = doc.participant1.kind === 'bye' ? 2 : 1;
      await resolveWinnerSlots(doc, winnerSlot);
    }
  }

  await TournamentModel.findByIdAndUpdate(tournamentId, {
    currentRound: currentRound + 1,
    $inc: { 'stats.totalMatches': newMatches.filter((m) => !m.isBye).length },
  });

  realtime.tournament(tournamentId, 'swiss:round_generated', { round: currentRound + 1 });
  return true;
}

/** After a group stage completes, seed advancing players into the knockout bracket. */
export async function advanceGroupStage(tournamentId: string): Promise<boolean> {
  await connectDB();
  const tournament = await TournamentModel.findById(tournamentId);
  if (!tournament || tournament.format !== 'group_knockout') return false;

  const matches = await MatchModel.find({ tournament: tournamentId }).lean();
  const groupMatches = matches.filter((m) => m.stage === 'group');
  if (groupMatches.some((m) => m.status !== 'completed' && m.status !== 'walkover')) return false;

  const koMatches = matches.filter((m) => m.stage === 'knockout' && m.round === 1);
  const perGroup = koMatches.length
    ? Math.ceil(koMatches.length * 2 / new Set(groupMatches.map((m) => m.groupId)).size)
    : 2;

  const groups = [...new Set(groupMatches.map((m) => m.groupId))];
  const advancers: { ref: string; name: string; kind: string; logo?: string }[] = [];

  for (const gid of groups) {
    const rows = computeStandings(groupMatches.filter((m) => m.groupId === gid));
    advancers.push(
      ...rows.slice(0, perGroup).map((r) => ({
        ref: r.ref,
        name: r.name,
        kind: tournament.type === 'team' ? 'team' : 'user',
      })),
    );
  }

  // Fill knockout round-1 slots.
  for (let i = 0; i < koMatches.length; i++) {
    const m = koMatches[i]!;
    const a = advancers[i * 2];
    const b = advancers[i * 2 + 1];
    await MatchModel.findByIdAndUpdate(m._id, {
      participant1: a
        ? { kind: a.kind, ref: a.ref && Types.ObjectId.isValid(a.ref) ? new Types.ObjectId(a.ref) : null, name: a.name, score: 0, seed: i * 2 + 1 }
        : { kind: 'tbd', name: 'TBD', score: 0 },
      participant2: b
        ? { kind: b.kind, ref: b.ref && Types.ObjectId.isValid(b.ref) ? new Types.ObjectId(b.ref) : null, name: b.name, score: 0, seed: i * 2 + 2 }
        : { kind: 'tbd', name: 'TBD', score: 0 },
      status: a && b ? 'scheduled' : 'pending',
    });
  }

  await TournamentModel.findByIdAndUpdate(tournamentId, { currentRound: 1 });
  realtime.tournament(tournamentId, 'groups:advanced', { count: advancers.length });
  return true;
}
