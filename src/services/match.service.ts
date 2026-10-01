import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import {
  MatchModel,
  RegistrationModel,
  TeamModel,
  TournamentModel,
  UserModel,
  type MatchDoc,
  type TournamentDoc,
} from '@/models';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { hasRole, type SessionUser } from '@/lib/auth';
import { realtime } from '@/lib/realtime';
import { notifyMany, notifyUser } from './notification.service';
import { recordMatchResultStats } from './leaderboard.service';
import {
  advanceGroupStage,
  generateNextSwissRound,
  resolveWinnerSlots,
} from './bracket.service';
import { logAdminAction } from './audit.service';

const WIN_TARGET: Record<string, number> = { bo1: 1, bo3: 2, bo5: 3, bo7: 4 };

export interface ScoreInput {
  score1: number;
  score2: number;
  games?: { participant: 1 | 2; score: number; gameNumber: number }[];
  notes?: string;
}

function assertCanReport(match: MatchDoc, reporter: SessionUser, tournament: TournamentDoc) {
  if (hasRole(reporter, 'moderator')) return;
  const isOrganizer = String(tournament.organizer) === reporter.id;
  if (isOrganizer) return;
  const p1 = match.participant1?.ref ? String(match.participant1.ref) : '';
  const p2 = match.participant2?.ref ? String(match.participant2.ref) : '';
  if (p1 === reporter.id || p2 === reporter.id) return;
  // Team matches: any team member may report.
  if (p1 || p2) {
    throw new ForbiddenError('Only match participants, the organizer or moderators can report results.');
  }
  throw new ForbiddenError('Not authorised for this match.');
}

/** Report a match result, advance winners/losers and cascade tournament state. */
export async function reportMatchResult(
  matchId: string,
  reporter: SessionUser,
  input: ScoreInput,
) {
  await connectDB();
  const match = (await MatchModel.findById(matchId)) as MatchDoc | null;
  if (!match) throw new NotFoundError('Match not found');
  if (match.status === 'completed') {
    throw new ConflictError('This match has already been completed.');
  }
  if (match.participant1.kind === 'tbd' || match.participant2.kind === 'tbd') {
    throw new ValidationError('Both participants must be determined before reporting a result.');
  }

  const tournament = await TournamentModel.findById(match.tournament);
  if (!tournament) throw new NotFoundError('Tournament not found');
  assertCanReport(match, reporter, tournament);

  const { score1, score2 } = input;
  if (score1 === score2) {
    throw new ValidationError('A knockout match cannot end in a draw.');
  }
  const target = WIN_TARGET[match.format] ?? 2;
  const winnerScore = Math.max(score1, score2);
  if (winnerScore !== target) {
    throw new ValidationError(`A ${match.format.toUpperCase()} series must be won ${target}-${Math.max(0, target - 1)} (or better).`);
  }

  const winnerSlot: 1 | 2 = score1 > score2 ? 1 : 2;

  match.participant1.score = score1;
  match.participant2.score = score2;
  match.scores = input.games?.length
    ? input.games
    : [
        { participant: 1, score: score1, gameNumber: 1 },
        { participant: 2, score: score2, gameNumber: 1 },
      ];
  if (input.notes) match.notes = input.notes;
  match.reportedBy = new Types.ObjectId(reporter.id) as any;
  match.startedAt = match.startedAt ?? new Date();
  match.completedAt = new Date();
  match.durationSeconds = Math.max(
    0,
    Math.floor((match.completedAt.getTime() - (match.startedAt ?? match.completedAt).getTime()) / 1000),
  );
  match.status = 'completed';

  await resolveWinnerSlots(match, winnerSlot);

  // Stats + leaderboard.
  const saved = (await MatchModel.findById(match._id)) as MatchDoc;
  await recordMatchResultStats(saved, tournament);

  // Tournament progress bookkeeping.
  await TournamentModel.findByIdAndUpdate(tournament._id, {
    $inc: { 'stats.completedMatches': 1 },
  });

  // Format-specific progression.
  const freshTournament = (await TournamentModel.findById(tournament._id)) as TournamentDoc;
  if (freshTournament.format === 'swiss') {
    await generateNextSwissRound(String(freshTournament._id));
  }
  if (freshTournament.format === 'group_knockout') {
    await advanceGroupStage(String(freshTournament._id));
  }

  // Grand-final detection → tournament completion.
  await checkTournamentCompletion(String(tournament._id));

  const winnerName = saved.winner?.name ?? 'TBD';
  realtime.match(String(tournament._id), 'match:completed', {
    matchId: String(saved._id),
    matchNumber: saved.matchNumber,
    winner: saved.winner,
    score: `${score1}-${score2}`,
    tournamentId: String(tournament._id),
  });

  // Notify both sides.
  const p1Ref = saved.participant1?.ref ? String(saved.participant1.ref) : null;
  const p2Ref = saved.participant2?.ref ? String(saved.participant2.ref) : null;
  const loserRef = winnerSlot === 1 ? p2Ref : p1Ref;
  const winnerRef = winnerSlot === 1 ? p1Ref : p2Ref;

  if (winnerRef && freshTournament.type !== 'team') {
    await notifyUser(winnerRef, {
      type: 'match_result',
      title: 'Match won! 🏆',
      body: `You defeated ${winnerSlot === 1 ? saved.participant2.name : saved.participant1.name} ${Math.max(score1, score2)}-${Math.min(score1, score2)} in ${freshTournament.title}.`,
      link: `/tournaments/${freshTournament.slug}/bracket`,
    });
  }
  if (loserRef && freshTournament.type !== 'team') {
    await notifyUser(loserRef, {
      type: 'match_result',
      title: 'Match result',
      body: `Your match in ${freshTournament.title} has concluded. GG!`,
      link: `/tournaments/${freshTournament.slug}/bracket`,
    });
  }

  return { match: saved, winnerName };
}

/** Walk-over / dispute resolution by organizer/moderator. */
export async function setMatchWinner(
  matchId: string,
  admin: SessionUser,
  winnerSlot: 1 | 2,
  reason = 'Walkover',
) {
  await connectDB();
  const match = (await MatchModel.findById(matchId)) as MatchDoc | null;
  if (!match) throw new NotFoundError('Match not found');
  const tournament = await TournamentModel.findById(match.tournament);
  if (!tournament) throw new NotFoundError('Tournament not found');

  const isOrganizer = String(tournament.organizer) === admin.id;
  if (!hasRole(admin, 'moderator') && !isOrganizer) {
    throw new ForbiddenError('Only the organizer or moderators can override a result.');
  }

  match.status = 'walkover';
  match.completedAt = new Date();
  match.notes = reason;
  match.participant1.score = winnerSlot === 1 ? 1 : 0;
  match.participant2.score = winnerSlot === 2 ? 1 : 0;
  await resolveWinnerSlots(match, winnerSlot);
  await checkTournamentCompletion(String(tournament._id));

  await logAdminAction(admin, 'match:override', 'match', String(match._id), {
    winnerSlot,
    reason,
    tournament: tournament.title,
  });

  realtime.match(String(tournament._id), 'match:completed', {
    matchId: String(match._id),
    matchNumber: match.matchNumber,
    walkover: true,
  });
  return match;
}

/** Detect the final match of the tournament and close it out. */
export async function checkTournamentCompletion(tournamentId: string) {
  await connectDB();
  const tournament = (await TournamentModel.findById(tournamentId)) as TournamentDoc | null;
  if (!tournament || tournament.status === 'completed') return;

  const matches = await MatchModel.find({ tournament: tournamentId }).lean();

  let finalMatch: any = null;
  if (tournament.format === 'double_elimination') {
    finalMatch = matches.find((m: any) => m.stage === 'grand_final');
  } else if (tournament.format === 'round_robin' || tournament.format === 'swiss') {
    const incomplete = matches.some((m: any) => m.status !== 'completed' && m.status !== 'walkover' && m.status !== 'cancelled');
    if (!incomplete && matches.length > 0) {
      const { computeStandings } = await import('./bracket.service');
      const rows = computeStandings(matches as any);
      if (rows[0]) {
        tournament.winner = {
          kind: tournament.type === 'team' ? 'team' : 'user',
          ref: Types.ObjectId.isValid(rows[0].ref) ? new Types.ObjectId(rows[0].ref) : null,
          name: rows[0].name,
        } as any;
        tournament.runnerUp = rows[1]
          ? ({
              kind: tournament.type === 'team' ? 'team' : 'user',
              ref: Types.ObjectId.isValid(rows[1].ref) ? new Types.ObjectId(rows[1].ref) : null,
              name: rows[1].name,
            } as any)
          : tournament.runnerUp;
      }
    }
  } else {
    // single elim / group_knockout: the last non-placement match
    finalMatch = matches
      .filter((m: any) => !m.isThirdPlace && m.stage !== 'group')
      .sort((a: any, b: any) => b.matchNumber - a.matchNumber)[0];
    // prefer explicit grand final round match
    const gf = matches.find(
      (m: any) => m.roundName === 'Grand Final' && m.status === 'completed',
    );
    if (gf) finalMatch = gf;
    else if (finalMatch && finalMatch.status !== 'completed' && finalMatch.status !== 'walkover') {
      finalMatch = null;
    }
  }

  if (finalMatch && (finalMatch.status === 'completed' || finalMatch.status === 'walkover')) {
    tournament.winner = {
      kind: finalMatch.winner?.kind ?? 'none',
      ref: finalMatch.winner?.ref ?? null,
      name: finalMatch.winner?.name ?? '',
    } as any;
    tournament.runnerUp = {
      kind: finalMatch.loser?.kind ?? 'none',
      ref: finalMatch.loser?.ref ?? null,
      name: finalMatch.loser?.name ?? '',
    } as any;
  }

  const allDone = matches.every(
    (m: any) => m.status === 'completed' || m.status === 'walkover' || m.status === 'cancelled',
  );

  if (tournament.winner && (tournament.winner as any).kind !== 'none' && allDone) {
    tournament.status = 'completed';
    tournament.endsAt = tournament.endsAt ?? new Date();
    await tournament.save();

    // Update winner stats + notify.
    const winnerRef = (tournament.winner as any).ref;
    if (winnerRef && tournament.type !== 'team') {
      await UserModel.findByIdAndUpdate(winnerRef, {
        $inc: { 'stats.tournamentsWon': 1, 'stats.earnings': tournament.prizes?.[0]?.amount ?? 0 },
      });
      await notifyUser(String(winnerRef), {
        type: 'tournament_victory',
        title: 'Tournament Victory! 🏆',
        body: `Congratulations! You won ${tournament.title}${tournament.prizes?.[0]?.amount ? ` and ₹${tournament.prizes[0].amount}` : ''}.`,
        link: `/tournaments/${tournament.slug}`,
      });
    } else if (winnerRef && tournament.type === 'team') {
      await TeamModel.findByIdAndUpdate(winnerRef, {
        $inc: {
          'stats.tournamentsWon': 1,
          'stats.earnings': tournament.prizes?.[0]?.amount ?? 0,
        },
      });
    }

    // Participation + prize notifications for runner-up & participants.
    await notifyMany(
      {
        type: 'tournament_victory',
        title: `${tournament.title} has concluded`,
        body: `${tournament.winner.name} is the champion! Check the final standings and bracket.`,
        link: `/tournaments/${tournament.slug}/bracket`,
      },
      {
        tournament: tournament._id,
        status: 'confirmed',
      },
    );

    realtime.tournament(tournamentId, 'tournament:completed', {
      winner: tournament.winner,
      tournamentId,
    });
  }
}

/** Cancel a registration (player or organizer). */
export async function cancelRegistration(
  registrationId: string,
  actor: SessionUser,
  reason = '',
) {
  await connectDB();
  const reg = await RegistrationModel.findById(registrationId);
  if (!reg) throw new NotFoundError('Registration not found');
  const tournament = await TournamentModel.findById(reg.tournament);
  if (!tournament) throw new NotFoundError('Tournament not found');

  const isOwner = String(reg.user) === actor.id;
  const canModerate = hasRole(actor, 'moderator') || String(tournament.organizer) === actor.id;
  if (!isOwner && !canModerate) {
    throw new ForbiddenError('You cannot cancel this registration.');
  }
  if (reg.status === 'cancelled') return reg;
  if (tournament.status === 'ongoing' || tournament.status === 'completed') {
    if (!canModerate) throw new ConflictError('Registration can no longer be cancelled.');
  }
  if (isOwner && tournament.settings?.allowCancel !== false && !canModerate) {
    const deadlineHours = tournament.settings?.cancelDeadlineHours ?? 24;
    const deadline = new Date(tournament.startsAt.getTime() - deadlineHours * 3600 * 1000);
    if (new Date() > deadline) {
      throw new ConflictError(`Cancellations close ${deadlineHours}h before the start.`);
    }
  }

  reg.status = 'cancelled';
  reg.cancelledAt = new Date();
  reg.cancelReason = reason;
  await reg.save();

  await TournamentModel.findByIdAndUpdate(tournament._id, {
    $inc: { participantsCount: -1 },
    $max: { participantsCount: 0 },
  });

  await notifyUser(String(reg.user), {
    type: 'registration_cancelled',
    title: 'Registration cancelled',
    body: `Your registration for ${tournament.title} has been cancelled.`,
    link: `/dashboard/my-tournaments`,
  });

  realtime.tournament(String(tournament._id), 'registration:cancelled', {
    registrationId: String(reg._id),
    userId: String(reg.user),
  });

  return reg;
}

/** Start a tournament: lock registration, generate bracket if missing, notify players. */
export async function startTournament(tournamentId: string, actor: SessionUser) {
  await connectDB();
  const tournament = (await TournamentModel.findById(tournamentId)) as TournamentDoc | null;
  if (!tournament) throw new NotFoundError('Tournament not found');
  const isOrganizer = String(tournament.organizer) === actor.id;
  if (!hasRole(actor, 'moderator') && !isOrganizer) {
    throw new ForbiddenError('Only the organizer or staff can start this tournament.');
  }
  if (tournament.status === 'completed' || tournament.status === 'cancelled') {
    throw new ConflictError(`Tournament is ${tournament.status}.`);
  }

  tournament.status = 'ongoing';
  tournament.registrationOpen = false;
  await tournament.save();

  const { generateTournamentBracket } = await import('./bracket.service');
  const existing = await MatchModel.countDocuments({ tournament: tournamentId });
  if (existing === 0) {
    await generateTournamentBracket(tournamentId, {
      generatedBy: actor.id,
      seeding: tournament.seeding as 'auto' | 'random',
    });
  }

  await notifyMany(
    {
      type: 'tournament_starting',
      title: `${tournament.title} is live!`,
      body: `The bracket has been generated. Check your first match and GLHF!`,
      link: `/tournaments/${tournament.slug}/bracket`,
    },
    { tournament: tournament._id, status: 'confirmed' },
  );

  realtime.tournament(tournamentId, 'tournament:started', { tournamentId });
  await logAdminAction(actor, 'tournament:start', 'tournament', tournamentId, {});
  return tournament;
}
