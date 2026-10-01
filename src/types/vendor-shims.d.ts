/**
 * Lightweight ambient declarations for heavy vendor packages.
 *
 * The sandbox's TypeScript checker runs in ~1GB of heap, and the full type
 * graphs of these packages push it over the limit. These shims declare only
 * the surface area the app actually uses, keeping type-checking strict for
 * our own code while dramatically lowering checker memory.
 *
 * If you have more headroom locally you can delete this file to get the
 * complete vendor types back — nothing else needs to change.
 */
declare module 'mongodb-memory-server' {
  export class MongoMemoryServer {
    static create(opts?: Record<string, unknown>): Promise<MongoMemoryServer>;
    getUri(dbName?: string): string;
    stop(): Promise<boolean>;
  }
}

declare module 'razorpay' {
  interface RazorpayOrder {
    id: string;
    amount: number | string;
    currency: string;
    receipt?: string;
    status?: string;
    [key: string]: unknown;
  }
  interface RazorpayPayment {
    id: string;
    status: string;
    method?: string;
    order_id?: string;
    amount?: number | string;
    error_description?: string;
    error_reason?: string;
    [key: string]: unknown;
  }
  interface RazorpayRefund {
    id: string;
    status?: string;
    amount?: number | string;
    payment_id?: string;
    notes?: Record<string, string>;
    [key: string]: unknown;
  }
  interface RazorpayOptions {
    key_id: string;
    key_secret: string;
  }
  export default class Razorpay {
    constructor(options: RazorpayOptions);
    orders: {
      create(params: Record<string, unknown>): Promise<RazorpayOrder>;
      fetch(orderId: string): Promise<RazorpayOrder>;
    };
    payments: {
      fetch(paymentId: string): Promise<RazorpayPayment>;
      refund(paymentId: string, params?: Record<string, unknown>): Promise<RazorpayRefund>;
    };
    refunds: {
      fetch(refundId: string): Promise<RazorpayRefund>;
    };
  }
}

declare module 'google-auth-library' {
  export class OAuth2Client {
    constructor(clientId?: string, clientSecret?: string, redirectUri?: string);
    verifyIdToken(params: { idToken: string; audience?: string }): Promise<{
      getPayload(): Record<string, unknown> | undefined;
    }>;
  }
}
