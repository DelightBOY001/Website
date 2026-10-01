import type { NextRequest } from 'next/server';
import { handler, jsonOk, parseBody, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireRole } from '@/lib/auth';
import { adminUserUpdateSchema } from '@/lib/validation';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models';
import { NotFoundError, ForbiddenError, ConflictError } from '@/lib/errors';
import { logAdminAction } from '@/services/audit.service';
import { notifyUser } from '@/services/notification.service';
import { realtime } from '@/lib/realtime';

/** GET /api/admin/users/[id] — full user detail + activity. */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  limitFor(req, 'api');
  await requireRole('moderator');
  const { id } = await ctx.params;
  await connectDB();
  const user = await UserModel.findById(id).populate('achievements').lean();
  if (!user) throw new NotFoundError('User not found');

  const [{ RegistrationModel }, { PaymentModel }, { MatchModel }] = await Promise.all([
    import('@/models'),
    import('@/models'),
    import('@/models'),
  ]);
  const [registrations, payments, matches] = await Promise.all([
    RegistrationModel.countDocuments({ user: id }),
    PaymentModel.countDocuments({ user: id }),
    MatchModel.countDocuments({
      $or: [{ 'participant1.ref': id }, { 'participant2.ref': id }],
    }),
  ]);

  return jsonOk(serialize({ user, activity: { registrations, payments, matches } }));
});

/** PATCH /api/admin/users/[id] — role/status/ban management. */
export const PATCH = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  limitFor(req, 'write');
  const admin = await requireRole('admin');
  const { id } = await ctx.params;
  const body = await parseBody(req, adminUserUpdateSchema);
  await connectDB();

  const user = await UserModel.findById(id);
  if (!user) throw new NotFoundError('User not found');

  // Super-admin protection: only a super_admin can change another super_admin.
  if (user.role === 'super_admin' && admin.role !== 'super_admin') {
    throw new ForbiddenError('Only a super admin can modify a super admin.');
  }
  if (id === admin.id && body.status && body.status !== 'active') {
    throw new ConflictError('You cannot suspend or ban your own account.');
  }
  if (body.role === 'super_admin' && admin.role !== 'super_admin') {
    throw new ForbiddenError('Only a super admin can grant the super admin role.');
  }

  const changes: Record<string, unknown> = {};
  if (body.role) {
    user.role = body.role;
    changes.role = body.role;
  }
  if (body.status) {
    user.status = body.status;
    changes.status = body.status;
    if (body.status === 'banned') {
      user.banReason = body.banReason ?? 'Violation of platform rules';
      user.bannedUntil = undefined as any;
    }
    if (body.status === 'suspended') {
      user.suspensionReason = body.suspensionReason ?? 'Suspended by moderation team';
    }
    if (body.status === 'active') {
      user.banReason = '';
      user.suspensionReason = '';
    }
  }
  if (body.banReason) user.banReason = body.banReason;
  if (body.suspensionReason) user.suspensionReason = body.suspensionReason;
  if (body.emailVerified !== undefined) user.emailVerified = body.emailVerified;

  await user.save();
  await logAdminAction(admin, 'user:update', 'user', id, changes);

  if (body.status && body.status !== 'active') {
    await notifyUser(id, {
      type: 'admin_action',
      title: body.status === 'banned' ? 'Account banned' : 'Account suspended',
      body: `${body.status === 'banned' ? body.banReason : body.suspensionReason ?? 'Your account status changed.'} Contact support if you believe this is a mistake.`,
      link: '/contact',
    });
  }
  realtime.admin('user:updated', { userId: id, changes });

  return jsonOk(serialize({ ok: true, user }));
});
