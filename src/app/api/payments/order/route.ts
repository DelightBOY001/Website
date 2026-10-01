import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonCreated, serialize, parseBody } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireSession } from '@/lib/auth';
import { registerTournamentSchema } from '@/lib/validation';
import { createRegistrationOrder } from '@/services/payment.service';

const orderSchema = registerTournamentSchema.extend({
  tournamentId: z.string().min(1),
});

/** POST /api/payments/order — create a Razorpay order + pending registration. */
export const POST = handler(async (req: NextRequest) => {
  limitFor(req, 'payment', 'order');
  const session = await requireSession();
  const body = await parseBody(req, orderSchema);
  const { tournamentId, ...opts } = body;
  const result = await createRegistrationOrder(session.user, tournamentId, opts);
  return jsonCreated(serialize(result));
});
