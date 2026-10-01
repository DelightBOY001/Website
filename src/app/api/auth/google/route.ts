import { NextResponse, type NextRequest } from 'next/server';
import { handler } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { createOAuthState, googleOAuthUrl } from '@/services/auth.service';
import { jsonError } from '@/lib/api';

/**
 * GET /api/auth/google — starts the Google OAuth flow.
 * CSRF protection via an HMAC-signed `state` cookie.
 */
export const GET = handler(async (req: NextRequest) => {
  limitFor(req, 'authWide', 'google');
  try {
    const state = createOAuthState();
    const url = googleOAuthUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set('nexus_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    return res;
  } catch (err) {
    return jsonError(err);
  }
});
