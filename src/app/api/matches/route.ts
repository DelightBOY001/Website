import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseQuery, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { connectDB } from '@/lib/db';
import { MatchModel } from '@/models';

const querySchema = z.object({
  tournament: z.string().optional(),
  status: z.string().optional(),
  round: z.coerce.number().optional(),
  participant: z.string().optional(),
  limit: z.coerce.number().min(1).max(300).optional(),
  page: z.coerce.number().min(1).optional(),
});

/** GET /api/matches — filterable match list. */
export const GET = handler(async (req: NextRequest) => {
  limitFor(req, 'api');
  const q = parseQuery(new URL(req.url).searchParams, querySchema);
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (q.tournament) filter.tournament = q.tournament;
  if (q.status) filter.status = q.status;
  if (q.round !== undefined) filter.round = q.round;
  if (q.participant) {
    filter.$or = [{ 'participant1.ref': q.participant }, { 'participant2.ref': q.participant }];
  }

  const limit = q.limit ?? 50;
  const page = q.page ?? 1;
  const [items, total] = await Promise.all([
    MatchModel.find(filter)
      .sort({ scheduledAt: 1, round: 1, position: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('tournament', 'title slug format type')
      .lean(),
    MatchModel.countDocuments(filter),
  ]);

  return jsonOk(serialize({ items, total, page, limit }));
});
