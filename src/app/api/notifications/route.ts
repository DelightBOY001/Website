import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseBody, parseQuery, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireSession } from '@/lib/auth';
import {
  getUnreadCount,
  listNotifications,
  markRead,
} from '@/services/notification.service';

const querySchema = z.object({
  unread: z.union([z.literal('true'), z.literal('false')]).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const readSchema = z.object({
  ids: z.union([z.array(z.string()).max(200), z.literal('all')]),
});

/** GET /api/notifications */
export const GET = handler(async (req: NextRequest) => {
  limitFor(req, 'api');
  const session = await requireSession();
  const q = parseQuery(new URL(req.url).searchParams, querySchema);
  const [items, unread] = await Promise.all([
    listNotifications(session.user.id, q.limit ?? 50, q.unread === 'true'),
    getUnreadCount(session.user.id),
  ]);
  return jsonOk(serialize({ items, unread }));
});

/** POST /api/notifications — mark as read. */
export const POST = handler(async (req: NextRequest) => {
  limitFor(req, 'write');
  const session = await requireSession();
  const body = await parseBody(req, readSchema);
  const result = await markRead(session.user.id, body.ids as string[] | 'all');
  return jsonOk(serialize(result));
});
