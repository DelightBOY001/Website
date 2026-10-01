import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseBody, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { getSession, hasRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { TeamModel, UserModel } from '@/models';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { notifyUser } from '@/services/notification.service';

const joinSchema = z.object({ inviteCode: z.string().min(4).max(30).optional() });
const removeSchema = z.object({ userId: z.string().min(1) });

/**
 * POST /api/teams/[id]/[action]
 *  - join   (via invite code or direct for open teams)
 *  - leave
 *  - remove (captain removes a member)
 *  - invite (captain generates/resets the invite code + notifies a user)
 */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string; action: string }> }) => {
  const { id, action } = await ctx.params;
  const session = await getSession();
  if (!session) throw new ForbiddenError('Sign in required.');
  await connectDB();
  const team = await TeamModel.findById(id);
  if (!team || team.disbanded) throw new NotFoundError('Team not found');

  switch (action) {
    case 'join': {
      limitFor(req, 'write', 'team-join');
      const body = await parseBody(req, joinSchema);
      if (team.inviteCode && body.inviteCode !== team.inviteCode) {
        throw new ForbiddenError('Invalid invite code.');
      }
      const activeMembers = team.members?.filter((m: any) => m.status === 'active') ?? [];
      if (activeMembers.length >= team.maxSize) throw new ConflictError('Team is full.');
      if (activeMembers.some((m: any) => String(m.user) === session.user.id)) {
        throw new ConflictError('You are already on this team.');
      }
      team.members.push({
        user: session.user.id as any,
        role: 'player',
        joinedAt: new Date(),
        status: 'active',
      } as any);
      await team.save();
      await notifyUser(String(team.captain), {
        type: 'team_invite',
        title: 'New team member',
        body: `${session.user.name} joined ${team.name}.`,
        link: `/teams/${team.slug}`,
      });
      return jsonOk(serialize({ ok: true, team }));
    }
    case 'leave': {
      limitFor(req, 'write');
      if (String(team.captain) === session.user.id) {
        throw new ValidationError('The captain cannot leave. Transfer leadership or disband first.');
      }
      const member = team.members?.find(
        (m: any) => String(m.user) === session.user.id && m.status === 'active',
      );
      if (!member) throw new NotFoundError('You are not on this team.');
      (member as any).status = 'left';
      await team.save();
      return jsonOk(serialize({ ok: true }));
    }
    case 'remove': {
      limitFor(req, 'write');
      if (String(team.captain) !== session.user.id && !hasRole(session.user, 'moderator')) {
        throw new ForbiddenError('Only the captain can remove members.');
      }
      const body = await parseBody(req, removeSchema);
      const member = team.members?.find((m: any) => String(m.user) === body.userId);
      if (!member) throw new NotFoundError('Member not found.');
      (member as any).status = 'removed';
      await team.save();
      return jsonOk(serialize({ ok: true }));
    }
    case 'invite': {
      limitFor(req, 'write');
      if (String(team.captain) !== session.user.id) {
        throw new ForbiddenError('Only the captain can manage invites.');
      }
      const body = await parseBody(
        req,
        z.object({ userId: z.string().optional(), regenerate: z.boolean().optional() }),
      );
      if (body.regenerate) {
        team.inviteCode = `INV${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
        await team.save();
      }
      if (body.userId) {
        const user = await UserModel.findById(body.userId);
        if (user) {
          await notifyUser(body.userId, {
            type: 'team_invite',
            title: `Team invite — ${team.name}`,
            body: `${session.user.name} invited you to join ${team.name}. Use code ${team.inviteCode} to join.`,
            link: `/teams/${team.slug}`,
          });
        }
      }
      return jsonOk(serialize({ ok: true, inviteCode: team.inviteCode }));
    }
    default:
      return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown action' } }, { status: 404 });
  }
});
