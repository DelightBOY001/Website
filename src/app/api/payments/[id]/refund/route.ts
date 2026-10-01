import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseBody, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireRole } from '@/lib/auth';
import { refundPayment } from '@/services/payment.service';

const refundSchema = z.object({
  reason: z.string().max(300).optional(),
  amountPaise: z.number().int().min(1).optional(),
});

/** POST /api/payments/[id]/refund — admin refund. */
export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  limitFor(req, 'payment', 'refund');
  const admin = await requireRole('admin');
  const body = await parseBody(req, refundSchema);
  const payment = await refundPayment(id, admin, body.reason ?? 'Refund by admin', body.amountPaise);
  return jsonOk(serialize({ ok: true, payment }));
});
