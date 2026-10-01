import { NextResponse, type NextRequest } from 'next/server';
import { handler, jsonError } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { exchangeGoogleCode, upsertGoogleUser } from '@/services/auth.service';
import { ValidationError } from '@/lib/errors';
import { env } from '@/lib/env';

/**
 * GET /api/auth/google/callback — completes the Google OAuth flow,
 * verifies `state`, exchanges the code and creates the session.
 */
export const GET = handler(async (req: NextRequest) => {
  limitFor(req, 'authWide', 'google-cb');
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const appUrl = env.APP_URL.replace(/\/$/, '');

  if (error) {
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(error)}`);
  }

  const expectedState = req.cookies.get('nexus_oauth_state')?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_state_mismatch`);
  }

  try {
    const profile = await exchangeGoogleCode(code);
    if (!profile.email) throw new ValidationError('Google account has no email.');
    await upsertGoogleUser(profile);
    const res = NextResponse.redirect(`${appUrl}/dashboard`);
    res.cookies.set('nexus_oauth_state', '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    console.error('[auth] google callback failed:', err);
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent('google_login_failed')}`,
    );
  }
});

void jsonError;
