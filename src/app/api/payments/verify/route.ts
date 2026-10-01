import type { NextRequest } from 'next/server';
import { handler, jsonOk, serialize, parseBody } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireSession } from '@/lib/auth';
import { paymentVerifySchema } from '@/lib/validation';
import { verifyAndConfirmPayment } from '@/services/payment.service';

/** POST /api/payments/verify — server-side signature verification + registration confirmation. */
export const POST = handler(async (req: NextRequest) => {
  limitFor(req, 'payment', 'verify');
  const session = await requireSession();
  const body = await parseBody(req, paymentVerifySchema);
  const result = await verifyAndConfirmPayment(session.user, body);
  return jsonOk(serialize(result));
});
