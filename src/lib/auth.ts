import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { connectDB } from './db';
import { env } from './env';
import { AuthError, ForbiddenError } from './errors';
import { ROLE_RANK, type UserRole } from '@/models/common';
import type { AuthSession, SessionUser } from '@/types';

export type { AuthSession, SessionUser };

export const SESSION_COOKIE = 'nexus_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
const REFRESH_THRESHOLD = 24 * 60 * 60;

function secretKey(): Uint8Array {
  const secret = env.AUTH_SECRET;
  if (!secret) {
    const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
    if (process.env.NODE_ENV === 'production' && serverless) {
      throw new Error('AUTH_SECRET must be set on Vercel/serverless. Generate one with: openssl rand -base64 32 — see README.md.');
    }
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[auth] AUTH_SECRET is not set — using an ephemeral development secret. Sessions will reset when the server restarts. Set AUTH_SECRET in .env.local (see README.md).',
      );
    }
    // Dev-only fallback so the app boots before .env.local exists.
    return new TextEncoder().encode('nexus-arena-dev-secret-change-me-please-32chars');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE)
    .setIssuer('nexus-arena')
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: 'nexus-arena' });
    const user = payload.user as SessionUser | undefined;
    if (!user?.id) return null;
    return {
      user,
      issuedAt: (payload.iat as number) * 1000,
      expiresAt: (payload.exp as number) * 1000,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSession(): Promise<AuthSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  if (session.expiresAt - Date.now() < REFRESH_THRESHOLD) {
    // Sliding session renewal.
    try {
      const fresh = await createSessionToken(session.user);
      await setSessionCookie(fresh);
    } catch {
      /* non-fatal */
    }
  }
  return session;
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) throw new AuthError();
  return session;
}

export async function requireUser(): Promise<SessionUser> {
  return (await requireSession()).user;
}

/** Role checks — `requireRole` accepts any role at or above the given rank. */
export function hasRole(user: SessionUser | null | undefined, minRole: UserRole): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[minRole];
}

export async function requireRole(minRole: UserRole): Promise<SessionUser> {
  const user = await requireUser();
  if (user.status === 'banned') {
    throw new ForbiddenError('This account has been banned.');
  }
  if (user.status === 'suspended') {
    throw new ForbiddenError('This account is suspended. Contact support.');
  }
  if (!hasRole(user, minRole)) {
    throw new ForbiddenError('You do not have permission to perform this action.');
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole('admin');
}

export async function requireModerator(): Promise<SessionUser> {
  return requireRole('moderator');
}

export async function requireOrganizer(): Promise<SessionUser> {
  return requireRole('organizer');
}

/**
 * Loads the live user record (role/status may have changed since the JWT
 * was issued). Use before sensitive operations.
 */
export async function requireFreshUser() {
  const session = await requireSession();
  await connectDB();
  const { UserModel } = await import('@/models');
  const user = await UserModel.findById(session.user.id);
  if (!user) throw new AuthError('Account no longer exists.');
  if (user.status === 'banned') throw new ForbiddenError('This account has been banned.');
  if (user.status === 'suspended') {
    throw new ForbiddenError('This account is suspended. Contact support.');
  }
  return user;
}

/** Token helpers for password reset / email verification. */
export function generateSecureToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function publicAppUrl(path = ''): string {
  const base = env.APP_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : path ? `/${path}` : ''}`;
}

/**
 * Use the configured canonical URL when present; otherwise derive the incoming
 * origin so local non-default ports and deployment preview hosts work. The exact
 * resulting callback URL still needs to be registered in Google Cloud Console.
 */
export function effectiveAppUrl(
  req: { nextUrl: { origin: string }; headers: { get(name: string): string | null } },
  path = '',
): string {
  let base: string;
  if (process.env.NEXT_PUBLIC_APP_URL) {
    base = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  } else {
    const fwdHost = req.headers.get('x-forwarded-host')?.split(',')[0].trim();
    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim().toLowerCase();
    const requestProto = new URL(req.nextUrl.origin).protocol.slice(0, -1);
    const proto = forwardedProto === 'http' || forwardedProto === 'https'
      ? forwardedProto
      : requestProto;
    base = fwdHost ? `${proto}://${fwdHost}` : req.nextUrl.origin;
  }
  return `${base}${path.startsWith('/') ? path : path ? `/${path}` : ''}`;
}
