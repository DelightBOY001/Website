/**
 * Centralised environment access. Secrets are only ever read on the server.
 * Client code must use NEXT_PUBLIC_* variables only.
 */
export const env = {
  get MONGODB_URI() {
    return process.env.MONGODB_URI || '';
  },
  get AUTH_SECRET() {
    return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
  },
  get APP_URL() {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  },
  get GOOGLE_CLIENT_ID() {
    return process.env.GOOGLE_CLIENT_ID || '';
  },
  get GOOGLE_CLIENT_SECRET() {
    return process.env.GOOGLE_CLIENT_SECRET || '';
  },
  get RAZORPAY_KEY_ID() {
    return process.env.RAZORPAY_KEY_ID || '';
  },
  get RAZORPAY_KEY_SECRET() {
    return process.env.RAZORPAY_KEY_SECRET || '';
  },
  get RAZORPAY_WEBHOOK_SECRET() {
    return process.env.RAZORPAY_WEBHOOK_SECRET || '';
  },
  get AI_API_KEY() {
    return process.env.AI_API_KEY || '';
  },
  get AI_BASE_URL() {
    return process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  },
  get AI_MODEL() {
    return process.env.AI_MODEL || 'gpt-4o-mini';
  },
  get EMAIL_API_KEY() {
    return process.env.EMAIL_API_KEY || '';
  },
  get EMAIL_FROM() {
    return process.env.EMAIL_FROM || 'NEXUS ARENA <onboarding@resend.dev>';
  },
  get PAYMENTS_DISABLED() {
    return process.env.PAYMENTS_DISABLED === 'true';
  },
};

/** True when running inside Next.js server runtime (route handlers / server components). */
export const isServer = typeof window === 'undefined';

export function requireServerEnv(key: 'AUTH_SECRET' | 'MONGODB_URI'): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
