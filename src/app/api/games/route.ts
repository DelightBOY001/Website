import type { NextRequest } from 'next/server';
import { handler, jsonOk, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { connectDB } from '@/lib/db';
import { GameModel } from '@/models';

/** GET /api/games — active game catalogue. */
export const GET = handler(async (_req: NextRequest) => {
  limitFor(_req, 'api');
  await connectDB();
  const items = await GameModel.find({ active: true })
    .sort({ featured: -1, tournamentCount: -1, name: 1 })
    .lean();
  return jsonOk(serialize({ items }));
});
