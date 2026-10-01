import type { NextRequest } from 'next/server';
import { handler, jsonOk, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireSession } from '@/lib/auth';
import { getPaymentHistory } from '@/services/payment.service';

/** GET /api/payments/history — the caller's payment history. */
export const GET = handler(async (req: NextRequest) => {
  limitFor(req, 'api');
  const session = await requireSession();
  const items = await getPaymentHistory(session.user.id);
  return jsonOk(serialize({ items }));
});

export const POST = GET;
