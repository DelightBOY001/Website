import type { NextRequest } from 'next/server';
import { jsonOk } from '@/lib/api';
import { handleWebhook } from '@/services/payment.service';

/**
 * POST /api/payments/webhook — Razorpay webhook endpoint.
 * Signature is verified against RAZORPAY_WEBHOOK_SECRET using the raw body.
 * Configure this URL in the Razorpay dashboard:
 *   https://<your-domain>/api/payments/webhook
 */
export async function POST(req: NextRequest): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  try {
    const result = await handleWebhook(rawBody, signature);
    if (!result.ok) {
      return jsonOk({ received: true, valid: false, reason: result.reason }, { status: 400 });
    }
    return jsonOk({ received: true, valid: true });
  } catch (err) {
    console.error('[webhook] error:', err);
    // Return 200 to avoid infinite retries for malformed events; real failures retry.
    return jsonOk({ received: true, valid: true });
  }
}

/** Razorpay also pings with GET during endpoint validation. */
export async function GET(): Promise<Response> {
  return jsonOk({ ok: true, service: 'razorpay-webhook' });
}
