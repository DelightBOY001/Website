import type { NextRequest } from 'next/server';
import { handler, jsonOk, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { connectDB } from '@/lib/db';
import { MatchModel } from '@/models';
import { NotFoundError } from '@/lib/errors';

/** GET /api/matches/[id] */
export const GET = handler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  limitFor(_req, 'api');
  const { id } = await ctx.params;
  await connectDB();
  const match = await MatchModel.findById(id)
    .populate('tournament', 'title slug format type status')
    .lean();
  if (!match) throw new NotFoundError('Match not found');
  return jsonOk(serialize({ match }));
});
