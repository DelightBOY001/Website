import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseQuery, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { getLeaderboard } from '@/services/leaderboard.service';

const querySchema = z.object({
  game: z.string().optional(),
  season: z.string().max(20).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

/** GET /api/leaderboard — global / game-specific / seasonal rankings. */
export const GET = handler(async (req: NextRequest) => {
  limitFor(req, 'api');
  const q = parseQuery(new URL(req.url).searchParams, querySchema);
  const result = await getLeaderboard({
    gameId: q.game ?? null,
    season: q.season,
    limit: q.limit ?? 25,
    offset: q.offset ?? 0,
  });
  return jsonOk(serialize(result));
});
