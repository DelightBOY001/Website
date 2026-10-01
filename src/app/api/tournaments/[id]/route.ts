import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseBody, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { createTournamentSchema } from '@/lib/validation';
import {
  deleteTournament,
  getTournamentBySlug,
  updateTournament,
} from '@/services/tournament.service';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { MatchModel, RegistrationModel, TournamentModel } from '@/models';
import { getBracketView } from '@/services/bracket.service';

const updateSchema = createTournamentSchema.partial().extend({
  status: z.enum(['draft', 'registration', 'upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
  featured: z.boolean().optional(),
  registrationOpen: z.boolean().optional(),
  liveStreamUrl: z.string().max(300).optional(),
  discordUrl: z.string().max(300).optional(),
});

/** GET /api/tournaments/[id] — details by id or slug (+ related data). */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  limitFor(req, 'api');
  const { id } = await ctx.params;

  let tournament: any;
  if (/^[0-9a-f]{24}$/i.test(id)) {
    await connectDB();
    tournament = await TournamentModel.findById(id)
      .populate('game', 'name slug accentColor coverImage genre platforms')
      .populate('organizer', 'name username avatar organizerProfile')
      .lean();
    if (tournament) tournament.slug = tournament.slug;
  } else {
    tournament = await getTournamentBySlug(id);
  }
  if (!tournament) {
    return jsonOk({ error: { code: 'NOT_FOUND', message: 'Tournament not found' } }, { status: 404 });
  }

  const session = await getSession();
  const [participants, bracket, userReg, matches] = await Promise.all([
    RegistrationModel.find({ tournament: tournament._id, status: { $in: ['confirmed', 'pending'] } })
      .sort({ seed: 1, createdAt: 1 })
      .populate('user', 'name username avatar playerId avatarColor stats.points')
      .populate('team', 'name tag logo color')
      .limit(200)
      .lean(),
    getBracketView(String(tournament._id)),
    session
      ? RegistrationModel.findOne({
          tournament: tournament._id,
          user: session.user.id,
        }).lean()
      : Promise.resolve(null),
    MatchModel.find({ tournament: tournament._id })
      .sort({ round: 1, position: 1 })
      .limit(300)
      .lean(),
  ]);

  return jsonOk(
    serialize({
      tournament,
      participants,
      bracket,
      matches,
      userRegistration: userReg,
      viewer: session?.user ?? null,
    }),
  );
});

/** PATCH /api/tournaments/[id] — organizer/moderator/admin update. */
export const PATCH = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  limitFor(req, 'write');
  const { id } = await ctx.params;
  const user = await getSession();
  if (!user) {
    return jsonOk({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } }, { status: 401 });
  }
  const body = await parseBody(req, updateSchema);
  const tournament = await updateTournament(user.user, id, body as any);
  return jsonOk({ ok: true, tournament: serialize(tournament) });
});

/** DELETE /api/tournaments/[id] */
export const DELETE = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  limitFor(req, 'write');
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) {
    return jsonOk({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } }, { status: 401 });
  }
  await deleteTournament(session.user, id);
  return jsonOk({ ok: true });
});
