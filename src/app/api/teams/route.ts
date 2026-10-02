import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonCreated, jsonOk, parseBody, parseQuery, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { TeamModel } from '@/models';
import { createTeamSchema } from '@/lib/validation';
import { ConflictError, ValidationError } from '@/lib/errors';
import { slugify, randomId } from '@/lib/utils';
import { logAdminAction } from '@/services/audit.service';

const querySchema = z.object({
  search: z.string().max(60).optional(),
  game: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  mine: z.union([z.literal('true'), z.literal('false')]).optional(),
});

/** GET /api/teams */
export const GET = handler(async (req: NextRequest) => {
  limitFor(req, 'api');
  const q = parseQuery(new URL(req.url).searchParams, querySchema);
  await connectDB();
  const filter: Record<string, unknown> = { disbanded: false };
  if (q.search) {
    filter.$or = [
      { name: { $regex: q.search, $options: 'i' } },
      { tag: { $regex: q.search, $options: 'i' } },
    ];
  }
  if (q.game) filter.game = q.game;
  if (q.mine === 'true') {
    const session = await requireSession();
    filter.$or = [
      { captain: session.user.id },
      { 'members.user': session.user.id },
    ];
    delete filter.disbanded;
  }
  const limit = q.limit ?? 20;
  const page = q.page ?? 1;
  const [items, total] = await Promise.all([
    TeamModel.find(filter)
      .sort({ 'stats.points': -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('captain', 'name username avatar')
      .populate('members.user', 'name username avatar playerId')
      .populate('game', 'name slug accentColor')
      .lean(),
    TeamModel.countDocuments(filter),
  ]);
  return jsonOk(serialize({ items, total, page, limit }));
});

/** POST /api/teams — create a team (creator becomes captain). */
export const POST = handler(async (req: NextRequest) => {
  limitFor(req, 'write', 'create-team');
  const session = await requireSession();
  const body = await parseBody(req, createTeamSchema);
  await connectDB();

  const existing = await TeamModel.findOne({
    name: { $regex: `^${body.name}$`, $options: 'i' },
    disbanded: false,
  });
  if (existing) throw new ConflictError('A team with this name already exists.');

  let slug = slugify(body.name);
  if (await TeamModel.findOne({ slug })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const team = await TeamModel.create({
    name: body.name,
    tag: body.tag?.toUpperCase() ?? body.name.slice(0, 3).toUpperCase(),
    slug,
    description: body.description ?? '',
    game: body.game ?? null,
    maxSize: body.maxSize ?? 5,
    color: body.color ?? '#9b8cf3',
    logo: body.logo ?? '',
    captain: session.user.id,
    inviteCode: randomId('inv').toUpperCase(),
    members: [
      {
        user: session.user.id,
        role: 'captain',
        joinedAt: new Date(),
        status: 'active',
      },
    ],
  });

  await logAdminAction(session.user, 'team:create', 'team', String(team._id), { name: team.name });
  return jsonCreated(serialize({ ok: true, team }));
});

void ValidationError;
