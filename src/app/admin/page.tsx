'use client';

import Link from 'next/link';
import {
  Users,
  Trophy,
  IndianRupee,
  Activity,
  AlertTriangle,
  Swords,
  UserPlus,
  CreditCard,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch } from '@/hooks/useData';
import { StatusBadge } from '@/components/ui/misc';
import { StatCard, Card, CardBody, CardHeader } from '@/components/ui/card';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { BarChart } from '@/components/charts';
import { formatCurrency, formatNumber, formatDateTime, cn } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data, loading, refetch } = useFetch<any>('/api/admin/overview');
  const d = data ?? {};

  return (
    <AppShell
      section="admin"
      title="Admin Dashboard"
      subtitle="Platform health, revenue and activity at a glance."
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={loading ? <Skeleton className="h-7 w-16" /> : formatNumber(d.totalUsers ?? 0)}
          icon={<Users className="h-4 w-4" />}
          hint={`+${d.newUsersToday ?? 0} today`}
          tone="cyan"
        />
        <StatCard
          label="Active Tournaments"
          value={loading ? <Skeleton className="h-7 w-16" /> : formatNumber(d.activeTournaments ?? 0)}
          icon={<Trophy className="h-4 w-4" />}
          hint={`${d.totalTournaments ?? 0} total`}
          tone="purple"
        />
        <StatCard
          label="Revenue Today"
          value={loading ? <Skeleton className="h-7 w-16" /> : formatCurrency(d.revenueToday ?? 0)}
          icon={<IndianRupee className="h-4 w-4" />}
          hint={`${formatCurrency(d.totalRevenue ?? 0)} all-time`}
          tone="lime"
        />
        <StatCard
          label="Registrations Today"
          value={loading ? <Skeleton className="h-7 w-16" /> : formatNumber(d.registrationsToday ?? 0)}
          icon={<UserPlus className="h-4 w-4" />}
          hint={`${formatNumber(d.totalRegistrations ?? 0)} total`}
          tone="pink"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Live Matches"
          value={loading ? '—' : formatNumber(d.liveMatches ?? 0)}
          icon={<Swords className="h-4 w-4" />}
          tone="pink"
        />
        <StatCard
          label="Completed Matches"
          value={loading ? '—' : formatNumber(d.completedMatches ?? 0)}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Failed Payments"
          value={loading ? '—' : formatNumber(d.failedPayments ?? 0)}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="pink"
        />
        <StatCard
          label="Refunds"
          value={loading ? '—' : formatCurrency(d.refundsTotal ?? 0)}
          icon={<CreditCard className="h-4 w-4" />}
          tone="purple"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue — Last 14 Days"
            subtitle="Captured payments in ₹"
            action={
              <Link href="/admin/reports" className="text-xs text-neon-cyan hover:underline">
                Full reports →
              </Link>
            }
          />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <BarChart
                data={(d.revenueByDay ?? []).map((r: any) => ({
                  label: r.date?.slice(5) ?? '',
                  value: r.amount,
                }))}
                formatValue={(v) => `₹${v}`}
                height={200}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top Tournaments" subtitle="By registrations" />
          <CardBody className="space-y-3">
            {(d.topTournaments ?? []).length === 0 && !loading ? (
              <EmptyState title="No tournaments yet" body="Create the first tournament." />
            ) : (
              (d.topTournaments ?? []).map((t: any, i: number) => (
                <Link
                  key={t._id}
                  href={`/admin/tournaments`}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 transition hover:border-neon-cyan/30"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold',
                      i === 0 ? 'bg-amber-400/15 text-amber-300' : 'bg-white/[0.05] text-slate-400',
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{t.title}</p>
                    <p className="text-xs text-slate-500">
                      {t.participantsCount}/{t.maxParticipants} players ·{' '}
                      {formatCurrency(t.prizePool ?? 0)}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recent Payments"
          subtitle="Latest transactions across the platform"
          action={
            <Link href="/admin/payments" className="flex items-center gap-1 text-xs text-neon-cyan hover:underline">
              All payments <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="table-base min-w-[640px]">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Tournament</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {(d.recentPayments ?? []).map((p: any) => (
                  <tr key={p._id}>
                    <td className="text-white">{p.user}</td>
                    <td className="text-slate-400">{p.tournament}</td>
                    <td className="font-semibold text-white">{formatCurrency(p.amount ?? 0)}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="text-xs text-slate-500">{formatDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </AppShell>
  );
}
