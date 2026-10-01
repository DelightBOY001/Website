import { RateLimitError } from './errors';

/**
 * In-memory sliding-window rate limiter (per key).
 * Suitable for a single instance / serverless warm container.
 * For multi-instance production, swap the store for Redis — the interface stays the same.
 */

interface Bucket {
  timestamps: number[];
}

const store = new Map<string, Bucket>();
const MAX_KEYS = 20000;

function sweep(now: number, windowMs: number) {
  if (store.size < MAX_KEYS) return;
  for (const [key, bucket] of store) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) store.delete(key);
    if (store.size < MAX_KEYS * 0.75) break;
  }
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): void {
  const now = Date.now();
  sweep(now, windowMs);
  let bucket = store.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    store.set(key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    throw new RateLimitError();
  }
  bucket.timestamps.push(now);
}

/** Standard limiters used across the API surface. */
export const limiters = {
  auth: { limit: 10, windowMs: 60_000 },
  authWide: { limit: 30, windowMs: 15 * 60_000 },
  api: { limit: 120, windowMs: 60_000 },
  write: { limit: 40, windowMs: 60_000 },
  ai: { limit: 20, windowMs: 60_000 },
  payment: { limit: 15, windowMs: 60_000 },
};

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || 'local';
}

export function limitFor(req: Request, kind: keyof typeof limiters, extraKey = ''): void {
  const cfg = limiters[kind];
  rateLimit(`${kind}:${clientIp(req)}${extraKey ? `:${extraKey}` : ''}`, cfg);
}
