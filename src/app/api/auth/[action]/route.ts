import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseBody } from '@/lib/api';
import { limitFor, clientIp } from '@/lib/rate-limit';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@/lib/validation';
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyEmailToken,
  toSessionUser,
} from '@/services/auth.service';
import {
  clearSessionCookie,
  getSession,
  requireSession,
} from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models';

export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ action: string }> }) => {
  const { action } = await ctx.params;
  limitFor(req, 'auth', action);

  switch (action) {
    case 'register': {
      const body = await parseBody(req, registerSchema);
      const user = await registerUser(body);
      return jsonOk({ ok: true, user });
    }
    case 'login': {
      const body = await parseBody(req, loginSchema);
      const user = await loginUser(body);
      return jsonOk({ ok: true, user });
    }
    case 'logout': {
      await clearSessionCookie();
      return jsonOk({ ok: true });
    }
    case 'forgot-password': {
      const body = await parseBody(req, forgotPasswordSchema);
      await requestPasswordReset(body.email);
      return jsonOk({
        ok: true,
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }
    case 'reset-password': {
      const body = await parseBody(req, resetPasswordSchema);
      await resetPassword(body.token, body.password);
      return jsonOk({ ok: true, message: 'Password updated. You can now sign in.' });
    }
    case 'verify-email': {
      const body = await parseBody(req, verifyEmailSchema);
      await verifyEmailToken(body.token);
      return jsonOk({ ok: true, message: 'Email verified successfully.' });
    }
    default:
      return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown auth action' } }, { status: 404 });
  }
});

export const GET = handler(async (_req: NextRequest, ctx: { params: Promise<{ action: string }> }) => {
  const { action } = await ctx.params;
  if (action !== 'me') {
    return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown auth action' } }, { status: 404 });
  }
  const session = await getSession();
  if (!session) return jsonOk({ user: null });

  // Refresh role/status from the database so permission changes take effect fast.
  await connectDB();
  const dbUser = await UserModel.findById(session.user.id).lean();
  if (!dbUser || (dbUser as any).status === 'banned') {
    await clearSessionCookie();
    return jsonOk({ user: null });
  }
  const fresh = toSessionUser({ ...(dbUser as any), _id: dbUser._id } as any);
  return jsonOk({ user: fresh });
});

// tiny helper import kept to satisfy unused lint patterns
void z;
void clientIp;
void requireSession;
