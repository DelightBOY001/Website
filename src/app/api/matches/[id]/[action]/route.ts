import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseBody, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireSession } from '@/lib/auth';
import { reportScoreSchema } from '@/lib/validation';
import { reportMatchResult, setMatchWinner } from '@/services/match.service';

const winnerSchema = z.object({
  winnerSlot: z.union([z.literal(1), z.literal(2)]),
  reason: z.string().max(500).optional(),
  score1: z.number().int().min(0).max(99).optional(),
  score2: z.number().int().min(0).max(99).optional(),
}).refine((value) => (value.score1 === undefined) === (value.score2 === undefined), {
  message: 'Provide both scores, or omit both to record a walkover.',
});

/**
 * POST /api/matches/[id]/[action]
 *  - report  → submit a result (participants / organizer / moderator)
 *  - winner  → organizer/moderator walkover or dispute resolution
 */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string; action: string }> }) => {
  const { id, action } = await ctx.params;
  const session = await requireSession();

  switch (action) {
    case 'report': {
      limitFor(req, 'write', 'report');
      const body = await parseBody(req, reportScoreSchema);
      const result = await reportMatchResult(id, session.user, body);
      return jsonOk(serialize({ ok: true, match: result.match, winnerName: result.winnerName }));
    }
    case 'winner': {
      limitFor(req, 'write');
      const body = await parseBody(req, winnerSchema);
      const match = await setMatchWinner(
        id,
        session.user,
        body.winnerSlot,
        body.reason,
        body.score1 !== undefined && body.score2 !== undefined
          ? { score1: body.score1, score2: body.score2 }
          : undefined,
      );
      return jsonOk(serialize({ ok: true, match }));
    }
    default:
      return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown action' } }, { status: 404 });
  }
});
