import type { NextRequest } from 'next/server';
import { handler, jsonOk, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import {
  MatchModel,
  PaymentModel,
  RegistrationModel,
  TournamentModel,
  UserModel,
} from '@/models';

/** GET /api/admin/overview — admin dashboard aggregates. */
export const GET = handler(async (req: NextRequest) => {
  limitFor(req, 'api');
  await requireRole('moderator');
  await connectDB();

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    newUsersToday,
    totalTournaments,
    activeTournaments,
    totalRegistrations,
    registrationsToday,
    liveMatches,
    completedMatches,
    failedPayments,
  ] = await Promise.all([
    UserModel.countDocuments(),
    UserModel.countDocuments({ createdAt: { $gte: dayStart } }),
    TournamentModel.countDocuments(),
    TournamentModel.countDocuments({ status: { $in: ['registration', 'upcoming', 'ongoing'] } }),
    RegistrationModel.countDocuments({ status: 'confirmed' }),
    RegistrationModel.countDocuments({ createdAt: { $gte: dayStart } }),
    MatchModel.countDocuments({ status: 'live' }),
    MatchModel.countDocuments({ status: { $in: ['completed', 'walkover'] } }),
    PaymentModel.countDocuments({ status: 'failed' }),
  ]);

  const revenueAgg = await PaymentModel.aggregate([
    { $match: { status: { $in: ['captured', 'refunded', 'partially_refunded'] } } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  const capturedAll = revenueAgg.find((a: any) => a._id === 'captured')?.total ?? 0;
  const refundedAll = revenueAgg.reduce(
    (acc: number, a: any) => acc + (a._id !== 'captured' ? a.total : 0),
    0,
  );

  const todayAgg = await PaymentModel.aggregate([
    { $match: { status: 'captured', paidAt: { $gte: dayStart } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  // Revenue by day for the last 14 days.
  const byDay = await PaymentModel.aggregate([
    { $match: { status: 'captured', paidAt: { $gte: new Date(Date.now() - 14 * 864e5) } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const revenueByDay = byDay.map((d: any) => ({
    date: d._id,
    amount: Math.round(d.amount / 100),
    count: d.count,
  }));

  const topTournaments = await TournamentModel.find()
    .sort({ participantsCount: -1 })
    .limit(5)
    .select('title slug participantsCount prizePool entryFee status')
    .lean();

  const recentPayments = await PaymentModel.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .populate('user', 'name email')
    .populate('tournament', 'title')
    .lean();

  return jsonOk(
    serialize({
      totalUsers,
      newUsersToday,
      totalTournaments,
      activeTournaments,
      totalRevenue: capturedAll / 100,
      revenueToday: (todayAgg[0]?.total ?? 0) / 100,
      refundsTotal: refundedAll / 100,
      totalRegistrations,
      registrationsToday,
      failedPayments,
      liveMatches,
      completedMatches,
      revenueByDay,
      topTournaments,
      recentPayments: recentPayments.map((p: any) => ({
        _id: String(p._id),
        user: p.user?.name ?? '—',
        tournament: p.tournament?.title ?? '—',
        amount: p.amount / 100,
        status: p.status,
        createdAt: p.createdAt,
      })),
      monthStart: monthStart.toISOString(),
    }),
  );
});
