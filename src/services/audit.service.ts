import { connectDB } from '@/lib/db';
import { AdminLogModel } from '@/models';
import type { SessionUser } from '@/lib/auth';

/** Immutable audit trail for sensitive/admin operations. */
export async function logAdminAction(
  actor: SessionUser | { id: string; role?: string; name?: string },
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {},
  ip = '',
) {
  try {
    await connectDB();
    await AdminLogModel.create({
      actor: actor.id,
      actorRole: (actor as SessionUser).role ?? '',
      action,
      targetType,
      targetId,
      details,
      ip,
    });
  } catch (err) {
    console.error('[audit] failed to log action:', err);
  }
}

export async function listAuditLogs(opts: {
  limit?: number;
  offset?: number;
  action?: string;
  actor?: string;
}) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (opts.action) filter.action = { $regex: opts.action, $options: 'i' };
  if (opts.actor) filter.actor = opts.actor;

  const [logs, total] = await Promise.all([
    AdminLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(opts.offset ?? 0)
      .limit(opts.limit ?? 50)
      .populate('actor', 'name username email role')
      .lean(),
    AdminLogModel.countDocuments(filter),
  ]);
  return { logs, total };
}
