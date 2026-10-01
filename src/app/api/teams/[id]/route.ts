import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseBody, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { getSession, hasRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { TeamModel } from '@/models';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

const patchSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  tag: z.string().max(8).optional(),
  description: z.string().max(1000).optional(),
  logo: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
  maxSize: z.number().min(2).max(10).optional(),
});

/** GET /api/teams/[id] — team profile (id or slug). */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  limitFor(req, 'api');
  const { id } = await ctx.params;
  await connectDB();
  const team = await TeamModel.findOne(
    /^[0-9a-f]{24}$/i.test(id) ? { _id: id } : { slug: id },
  )
    .populate('captain', 'name username avatar playerId stats')
    .populate('members.user', 'name username avatar playerId avatarColor stats.wins stats.losses')
    .populate('game', 'name slug accentColor');
  if (!team || team.disbanded) throw new NotFoundError('Team not found');

  const session = await getSession();
  const isCaptain = session && String(team.captain._id ?? team.captain) === session.user.id;
  const isMember = session && team.members?.some((m: any) => String(m.user?._id ?? m.user) === session.user.id);

  return jsonOk(
    serialize({
      team,
      viewerRole: isCaptain ? 'captain' : isMember ? 'member' : 'guest',
      // invite code only visible to the captain
      inviteCode: isCaptain ? team.inviteCode : undefined,
    }),
  );
});

/** PATCH /api/teams/[id] — captain (or admin) edits the team. */
export const PATCH = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  limitFor(req, 'write');
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) throw new ForbiddenError('Sign in required.');
  await connectDB();
  const team = await TeamModel.findById(id);
  if (!team) throw new NotFoundError('Team not found');
  if (String(team.captain) !== session.user.id && !hasRole(session.user, 'admin')) {
    throw new ForbiddenError('Only the captain can edit the team.');
  }
  const body = await parseBody(req, patchSchema);
  Object.assign(team, body);
  await team.save();
  return jsonOk(serialize({ ok: true, team }));
});
