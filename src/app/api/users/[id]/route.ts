import type { NextRequest } from 'next/server';
import { handler, jsonOk, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { connectDB } from '@/lib/db';
import { AchievementModel, MatchModel, UserModel } from '@/models';
import { NotFoundError } from '@/lib/errors';

/** GET /api/users/[id] — public player profile (id or username). */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  limitFor(req, 'api');
  const { id } = await ctx.params;
  await connectDB();

  const user = await UserModel.findOne(
    /^[0-9a-f]{24}$/i.test(id) ? { _id: id } : { username: id.toLowerCase() },
  )
    .select('name username avatar avatarColor bio region country role playerId stats socials createdAt')
    .lean();
  if (!user || (user as any).status === 'banned') throw new NotFoundError('Player not found');

  const [achievements, recentMatches] = await Promise.all([
    AchievementModel.find({ user: (user as any)._id }).sort({ unlockedAt: -1 }).limit(12).lean(),
    MatchModel.find({
      $or: [{ 'participant1.ref': (user as any)._id }, { 'participant2.ref': (user as any)._id }],
      status: 'completed',
    })
      .sort({ completedAt: -1 })
      .limit(10)
      .populate('tournament', 'title slug')
      .lean(),
  ]);

  return jsonOk(serialize({ user, achievements, recentMatches }));
});
