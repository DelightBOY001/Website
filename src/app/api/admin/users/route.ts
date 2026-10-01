import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseQuery, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models';

const querySchema = z.object({
  search: z.string().max(120).optional(),
  role: z.string().max(20).optional(),
  status: z.string().max(20).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  sort: z.enum(['newest', 'points', 'earnings', 'name']).optional(),
});

/** GET /api/admin/users — paginated user management. */
export const GET = handler(async (req: NextRequest) => {
  limitFor(req, 'api');
  await requireRole('moderator');
  const q = parseQuery(new URL(req.url).searchParams, querySchema);
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (q.search) {
    filter.$or = [
      { name: { $regex: q.search, $options: 'i' } },
      { email: { $regex: q.search, $options: 'i' } },
      { username: { $regex: q.search, $options: 'i' } },
      { playerId: { $regex: q.search, $options: 'i' } },
    ];
  }
  if (q.role) filter.role = q.role;
  if (q.status) filter.status = q.status;

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    points: { 'stats.points': -1 },
    earnings: { 'stats.earnings': -1 },
    name: { name: 1 },
  };
  const limit = q.limit ?? 25;
  const page = q.page ?? 1;

  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .sort(sortMap[q.sort ?? 'newest'] ?? sortMap.newest!)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name username email role status playerId avatar stats createdAt lastLoginAt')
      .lean(),
    UserModel.countDocuments(filter),
  ]);

  return jsonOk(serialize({ items, total, page, limit, pages: Math.ceil(total / limit) }));
});
