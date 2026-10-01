import type { NextRequest } from 'next/server';
import { handler, jsonOk, parseBody, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import {
  MatchModel,
  PaymentModel,
  RegistrationModel,
  TeamModel,
  UserModel,
} from '@/models';
import { getUserDashboardStats } from '@/services/leaderboard.service';
import { profileUpdateSchema } from '@/lib/validation';

/**
 * GET/PATCH /api/me/[action]
 *  - stats | tournaments | matches | teams | payments | profile
 */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ action: string }> }) => {
  limitFor(req, 'api');
  const { action } = await ctx.params;
  const session = await requireSession();
  const uid = session.user.id;
  await connectDB();

  switch (action) {
    case 'stats': {
      const stats = await getUserDashboardStats(uid);
      return jsonOk(serialize({ stats }));
    }
    case 'tournaments': {
      const items = await RegistrationModel.find({ user: uid })
        .sort({ createdAt: -1 })
        .populate({
          path: 'tournament',
          select: 'title slug status startsAt entryFee prizePool format type game participantsCount maxParticipants',
          populate: { path: 'game', select: 'name slug accentColor' },
        })
        .lean();
      return jsonOk(serialize({ items }));
    }
    case 'matches': {
      const items = await MatchModel.find({
        $or: [{ 'participant1.ref': uid }, { 'participant2.ref': uid }],
      })
        .sort({ scheduledAt: -1, round: -1 })
        .limit(100)
        .populate('tournament', 'title slug format type')
        .lean();
      return jsonOk(serialize({ items }));
    }
    case 'teams': {
      const items = await TeamModel.find({
        $or: [{ captain: uid }, { 'members.user': uid }],
        disbanded: false,
      })
        .populate('game', 'name slug')
        .populate('members.user', 'name username avatar')
        .lean();
      return jsonOk(serialize({ items }));
    }
    case 'payments': {
      const items = await PaymentModel.find({ user: uid })
        .sort({ createdAt: -1 })
        .populate('tournament', 'title slug entryFee')
        .lean();
      return jsonOk(serialize({ items }));
    }
    case 'profile': {
      const user = await UserModel.findById(uid).populate('achievements').lean();
      return jsonOk(serialize({ user }));
    }
    default:
      return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown action' } }, { status: 404 });
  }
});

export const PATCH = handler(async (req: NextRequest, ctx: { params: Promise<{ action: string }> }) => {
  limitFor(req, 'write');
  const { action } = await ctx.params;
  const session = await requireSession();
  if (action !== 'profile') {
    return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown action' } }, { status: 404 });
  }
  const body = await parseBody(req, profileUpdateSchema);
  await connectDB();
  const user = await UserModel.findById(session.user.id);
  if (!user) {
    return jsonOk({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });
  }
  if (body.name !== undefined) user.name = body.name;
  if (body.bio !== undefined) user.bio = body.bio;
  if (body.avatar !== undefined) user.avatar = body.avatar;
  if (body.region !== undefined) user.region = body.region;
  if (body.country !== undefined) user.country = body.country;
  if (body.socials) user.socials = { ...(user.socials as any), ...body.socials } as any;
  if (body.notificationPrefs) {
    user.notificationPrefs = { ...(user.notificationPrefs as any), ...body.notificationPrefs } as any;
  }
  await user.save();
  return jsonOk(serialize({ ok: true, user }));
});
