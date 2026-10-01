import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseBody, parseQuery, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import {
  MatchModel,
  PaymentModel,
  RegistrationModel,
  SettingsModel,
  TournamentModel,
} from '@/models';
import { listAuditLogs } from '@/services/audit.service';

const querySchema = z.object({
  status: z.string().max(20).optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  range: z.enum(['7d', '30d', '90d', 'all']).optional(),
});

/**
 * GET /api/admin/[entity]
 *  entities: tournaments | payments | matches | registrations | reports | logs | settings
 */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ entity: string }> }) => {
  limitFor(req, 'api');
  const user = await requireRole('moderator');
  const { entity } = await ctx.params;
  const q = parseQuery(new URL(req.url).searchParams, querySchema);
  await connectDB();

  const limit = q.limit ?? 25;
  const page = q.page ?? 1;
  const skip = (page - 1) * limit;

  switch (entity) {
    case 'tournaments': {
      const filter: Record<string, unknown> = {};
      if (q.status) filter.status = q.status;
      if (q.search) filter.title = { $regex: q.search, $options: 'i' };
      const [items, total] = await Promise.all([
        TournamentModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('game', 'name slug')
          .populate('organizer', 'name email')
          .lean(),
        TournamentModel.countDocuments(filter),
      ]);
      return jsonOk(serialize({ items, total, page, limit }));
    }
    case 'payments': {
      const filter: Record<string, unknown> = {};
      if (q.status) filter.status = q.status;
      if (q.search) {
        filter.$or = [
          { invoiceNumber: { $regex: q.search, $options: 'i' } },
          { razorpayOrderId: { $regex: q.search, $options: 'i' } },
          { razorpayPaymentId: { $regex: q.search, $options: 'i' } },
        ];
      }
      const [items, total] = await Promise.all([
        PaymentModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('user', 'name email')
          .populate('tournament', 'title slug')
          .lean(),
        PaymentModel.countDocuments(filter),
      ]);
      return jsonOk(serialize({ items, total, page, limit }));
    }
    case 'matches': {
      const filter: Record<string, unknown> = {};
      if (q.status) filter.status = q.status;
      const [items, total] = await Promise.all([
        MatchModel.find(filter)
          .sort({ scheduledAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('tournament', 'title slug')
          .lean(),
        MatchModel.countDocuments(filter),
      ]);
      return jsonOk(serialize({ items, total, page, limit }));
    }
    case 'registrations': {
      const [items, total] = await Promise.all([
        RegistrationModel.find(q.status ? { status: q.status } : {})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('user', 'name email username')
          .populate('tournament', 'title slug')
          .lean(),
        RegistrationModel.countDocuments(q.status ? { status: q.status } : {}),
      ]);
      return jsonOk(serialize({ items, total, page, limit }));
    }
    case 'reports': {
      const days = q.range === '30d' ? 30 : q.range === '90d' ? 90 : 7;
      const from = new Date(Date.now() - days * 864e5);
      const [revenueByDay, regsByDay, tournamentsByFormat, usersByRole, paymentsByStatus] =
        await Promise.all([
          PaymentModel.aggregate([
            { $match: { paidAt: { $gte: from }, status: 'captured' } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
                amount: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ]),
          RegistrationModel.aggregate([
            { $match: { createdAt: { $gte: from } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ]),
          TournamentModel.aggregate([{ $group: { _id: '$format', count: { $sum: 1 } } }]),
          (await import('@/models')).UserModel.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
          ]),
          PaymentModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        ]);
      return jsonOk(
        serialize({
          range: `${days}d`,
          revenueByDay: revenueByDay.map((d: any) => ({
            date: d._id,
            amount: d.amount / 100,
            count: d.count,
          })),
          regsByDay: regsByDay.map((d: any) => ({ date: d._id, count: d.count })),
          tournamentsByFormat,
          usersByRole,
          paymentsByStatus,
        }),
      );
    }
    case 'logs': {
      const { logs, total } = await listAuditLogs({
        limit,
        offset: skip,
        action: q.search,
      });
      return jsonOk(serialize({ items: logs, total, page, limit }));
    }
    case 'settings': {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return jsonOk(
          { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
          { status: 403 },
        );
      }
      const settings = (await SettingsModel.findOne({ key: 'platform' }).lean()) ?? {};
      return jsonOk(serialize({ settings }));
    }
    default:
      return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown entity' } }, { status: 404 });
  }
});

const settingsPatchSchema = z.object({
  siteName: z.string().max(60).optional(),
  tagline: z.string().max(160).optional(),
  maintenanceMode: z.boolean().optional(),
  allowRegistration: z.boolean().optional(),
  paymentsEnabled: z.boolean().optional(),
  platformFeePercent: z.number().min(0).max(50).optional(),
  taxPercent: z.number().min(0).max(50).optional(),
  aiEnabled: z.boolean().optional(),
  aiDailyLimit: z.number().min(1).optional(),
  notificationEmailEnabled: z.boolean().optional(),
  supportEmail: z.string().email().optional(),
  socials: z.record(z.string().max(200)).optional(),
});

/** PATCH /api/admin/settings */
export const PATCH = handler(async (req: NextRequest, ctx: { params: Promise<{ entity: string }> }) => {
  limitFor(req, 'write');
  const admin = await requireRole('admin');
  const { entity } = await ctx.params;
  if (entity !== 'settings') {
    return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown entity' } }, { status: 404 });
  }
  const body = await parseBody(req, settingsPatchSchema);
  await connectDB();
  const settings = await SettingsModel.findOneAndUpdate(
    { key: 'platform' },
    { $set: body, $setOnInsert: { key: 'platform' } },
    { upsert: true, new: true },
  );
  const { logAdminAction } = await import('@/services/audit.service');
  await logAdminAction(admin, 'settings:update', 'settings', 'platform', {
    fields: Object.keys(body),
  });
  return jsonOk(serialize({ ok: true, settings }));
});
