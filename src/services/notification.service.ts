import { connectDB } from '@/lib/db';
import { NotificationModel, UserModel, type NotificationType } from '@/models';
import { emailTemplates, sendEmail } from '@/lib/email';
import { realtime } from '@/lib/realtime';

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, unknown>;
  channel?: 'in-app' | 'email' | 'both';
}

async function maybeEmail(user: any, n: NotifyInput) {
  const prefs = user?.notificationPrefs ?? {};
  if (n.channel === 'in-app') return;
  if (prefs.email === false) return;
  const tpl =
    n.type === 'match_assigned'
      ? emailTemplates.generic(n.title, n.body)
      : emailTemplates.generic(n.title, n.body);
  await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
}

/** Create an in-app notification (and email when configured) for one user. */
export async function notifyUser(userId: string, input: NotifyInput) {
  await connectDB();
  const user = await UserModel.findById(userId).lean();
  if (!user) return null;

  const doc = await NotificationModel.create({
    user: userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? '',
    data: input.data ?? {},
    channel: input.channel ?? 'in-app',
    read: false,
  });

  realtime.notification(userId, {
    notification: {
      _id: String(doc._id),
      type: doc.type,
      title: doc.title,
      body: doc.body,
      link: doc.link,
      createdAt: doc.createdAt,
      read: false,
    },
    unread: await NotificationModel.countDocuments({ user: userId, read: false }),
  });

  if (input.channel === 'email' || input.channel === 'both') {
    await maybeEmail(user, input);
  }
  return doc;
}

/** Fan out a notification to every user matching a registration filter. */
export async function notifyMany(
  input: NotifyInput,
  filter: Record<string, unknown>,
) {
  await connectDB();
  const { RegistrationModel } = await import('@/models');
  const regs = await RegistrationModel.find(filter).select('user').lean();
  const userIds = [...new Set(regs.map((r) => String(r.user)))];
  const results = await Promise.all(userIds.map((id) => notifyUser(id, input)));
  return results.filter(Boolean).length;
}

export async function getUnreadCount(userId: string): Promise<number> {
  await connectDB();
  return NotificationModel.countDocuments({ user: userId, read: false });
}

export async function listNotifications(userId: string, limit = 50, unreadOnly = false) {
  await connectDB();
  return NotificationModel.find({ user: userId, ...(unreadOnly ? { read: false } : {}) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function markRead(userId: string, ids: string[] | 'all') {
  await connectDB();
  const filter = { user: userId, ...(ids === 'all' ? {} : { _id: { $in: ids } }) };
  await NotificationModel.updateMany(filter, { read: true, readAt: new Date() });
  const unread = await getUnreadCount(userId);
  realtime.notification(userId, { unread, type: 'notification:read' });
  return { ok: true, unread };
}
