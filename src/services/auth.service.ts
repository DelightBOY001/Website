import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { TokenModel, UserModel, type UserDoc } from '@/models';
import {
  createSessionToken,
  generateSecureToken,
  hashPassword,
  hashToken,
  publicAppUrl,
  setSessionCookie,
  verifyPassword,
} from '@/lib/auth';
import { AuthError, ConflictError, ValidationError } from '@/lib/errors';
import { generatePlayerId } from '@/lib/utils';
import { emailTemplates, sendEmail } from '@/lib/email';
import type { SessionUser } from '@/types';
import type { UserRole } from '@/models/common';

const AVATAR_COLORS = ['#62dce7', '#9b8cf3', '#f43f5e', '#22c55e', '#fbbf24', '#6b9fea', '#abd78a'];

export function toSessionUser(user: UserDoc): SessionUser {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    username: user.username,
    role: (user.role ?? 'player') as UserRole,
    status: (user.status ?? 'active') as SessionUser['status'],
    avatar: user.avatar ?? '',
    playerId: user.playerId,
    emailVerified: Boolean(user.emailVerified),
  };
}

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
  region?: string;
}

export async function registerUser(input: RegisterInput) {
  await connectDB();

  const existingEmail = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (existingEmail) throw new ConflictError('An account with this email already exists.');

  const existingUsername = await UserModel.findOne({ username: input.username.toLowerCase() });
  if (existingUsername) throw new ConflictError('This username is already taken.');

  const passwordHash = await hashPassword(input.password);
  const user = await UserModel.create({
    name: input.name.trim(),
    username: input.username.toLowerCase().trim(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
    playerId: generatePlayerId(),
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    region: input.region ?? 'IN',
    emailVerified: false,
  });

  // Email verification token.
  const { token, hash } = generateSecureToken();
  await TokenModel.create({
    user: user._id,
    type: 'email-verify',
    tokenHash: hash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  const verifyUrl = publicAppUrl(`/verify-email?token=${token}`);
  const tpl = emailTemplates.verifyEmail(user.name, verifyUrl);
  await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });

  const sessionUser = toSessionUser(user as unknown as UserDoc);
  const jwt = await createSessionToken(sessionUser);
  await setSessionCookie(jwt);

  return sessionUser;
}

export async function loginUser(input: { email: string; password: string }) {
  await connectDB();
  const user = (await UserModel.findOne({ email: input.email.toLowerCase() }).select(
    '+passwordHash',
  )) as (UserDoc & { passwordHash?: string }) | null;

  if (!user || !user.passwordHash) {
    throw new AuthError('Invalid email or password.');
  }
  if (user.status === 'banned') {
    throw new AuthError('This account has been banned. Contact support.');
  }
  if (user.status === 'suspended') {
    throw new AuthError('This account is suspended. Contact support.');
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new AuthError('Invalid email or password.');

  user.lastLoginAt = new Date();
  await user.save();

  const sessionUser = toSessionUser(user as unknown as UserDoc);
  const jwt = await createSessionToken(sessionUser);
  await setSessionCookie(jwt);
  return sessionUser;
}

export async function verifyEmailToken(token: string) {
  await connectDB();
  const hash = hashToken(token);
  const record = await TokenModel.findOne({ tokenHash: hash, type: 'email-verify' });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ValidationError('This verification link is invalid or has expired.');
  }
  record.usedAt = new Date();
  await record.save();
  await UserModel.findByIdAndUpdate(record.user, { emailVerified: true });
  return true;
}

export async function requestPasswordReset(email: string) {
  await connectDB();
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  // Always respond with success to avoid account enumeration.
  if (!user) return true;

  const { token, hash } = generateSecureToken();
  await TokenModel.create({
    user: user._id,
    type: 'password-reset',
    tokenHash: hash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  const resetUrl = publicAppUrl(`/reset-password?token=${token}`);
  const tpl = emailTemplates.resetPassword(user.name, resetUrl);
  await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
  return true;
}

export async function resetPassword(token: string, newPassword: string) {
  await connectDB();
  const hash = hashToken(token);
  const record = await TokenModel.findOne({ tokenHash: hash, type: 'password-reset' });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ValidationError('This reset link is invalid or has expired.');
  }
  const passwordHash = await hashPassword(newPassword);
  record.usedAt = new Date();
  await record.save();
  await UserModel.findByIdAndUpdate(record.user, {
    passwordHash,
    $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
  });
  return true;
}

/* ──────────────────────────── GOOGLE OAUTH ──────────────────────────── */

export function googleOAuthUrl(state: string, appBase?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new ValidationError(
      'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.',
    );
  }
  const base = (appBase ?? publicAppUrl()).replace(/\/$/, '');
  const redirectUri = `${base}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
}

export async function exchangeGoogleCode(code: string, appBase?: string): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ValidationError(
      'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.',
    );
  }
  const base = (appBase ?? publicAppUrl()).replace(/\/$/, '');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${base}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error('[google] token exchange failed:', text);
    throw new AuthError('Google sign-in failed. Please try again.');
  }
  const tokens = (await tokenRes.json()) as { access_token?: string; id_token?: string };
  if (!tokens.access_token) throw new AuthError('Google sign-in failed.');

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userInfoRes.ok) throw new AuthError('Could not load your Google profile.');
  return (await userInfoRes.json()) as GoogleProfile;
}

export async function upsertGoogleUser(profile: GoogleProfile) {
  await connectDB();
  let user = await UserModel.findOne({ email: profile.email.toLowerCase() });

  if (!user) {
    const baseUsername =
      profile.email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16) || 'player';
    let username = baseUsername;
    let n = 1;
    while (await UserModel.findOne({ username })) {
      username = `${baseUsername}${n++}`.slice(0, 24);
    }
    user = await UserModel.create({
      name: profile.name || baseUsername,
      username,
      email: profile.email.toLowerCase(),
      googleId: profile.sub,
      avatar: profile.picture ?? '',
      playerId: generatePlayerId(),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      emailVerified: profile.email_verified ?? true,
    });
  } else {
    user.googleId = profile.sub;
    if (!user.avatar && profile.picture) user.avatar = profile.picture;
    if (profile.email_verified) user.emailVerified = true;
    await user.save();
  }

  if (user.status === 'banned') throw new AuthError('This account has been banned.');
  if (user.status === 'suspended') throw new AuthError('This account is suspended.');

  user.lastLoginAt = new Date();
  await user.save();

  const sessionUser = toSessionUser(user as unknown as UserDoc);
  const jwt = await createSessionToken(sessionUser);
  await setSessionCookie(jwt);
  return sessionUser;
}

/** State token for CSRF protection on the OAuth flow. */
export function createOAuthState(): string {
  return crypto.randomBytes(16).toString('hex');
}
