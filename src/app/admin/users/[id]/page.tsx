'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Activity, CreditCard, Trophy, Swords, Shield } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch } from '@/hooks/useData';
import { Avatar, RoleBadge, StatusBadge } from '@/components/ui/misc';
import { StatCard, Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageLoader, ErrorState } from '@/components/ui/states';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, refetch } = useFetch<any>(
    id ? `/api/admin/users/${id}` : null,
  );

  if (loading) return <AppShell section="admin"><PageLoader /></AppShell>;
  if (error || !data?.user)
    return (
      <AppShell section="admin">
        <ErrorState onRetry={refetch} body={error ?? 'User not found'} />
      </AppShell>
    );

  const u = data.user;

  return (
    <AppShell section="admin" title="User Detail" subtitle={u.email}>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-neon-cyan"
      >
        <ArrowLeft className="h-4 w-4" /> All users
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardBody className="text-center">
            <div className="flex justify-center">
              <Avatar name={u.name} src={u.avatar} size="lg" className="!h-20 !w-20" />
            </div>
            <h2 className="mt-3 text-xl font-bold text-white">{u.name}</h2>
            <p className="text-sm text-slate-500">@{u.username}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <RoleBadge role={u.role} />
              <StatusBadge status={u.status} />
            </div>
            <div className="mt-4 rounded-xl border border-neon-cyan/15 bg-neon-cyan/[0.04] p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Player ID</p>
              <p className="font-mono text-lg font-bold text-neon-cyan">{u.playerId}</p>
            </div>
            <div className="mt-4 space-y-1.5 text-left text-xs text-slate-500">
              <p>Joined: {formatDate(u.createdAt)}</p>
              <p>Last login: {formatDate(u.lastLoginAt)}</p>
              <p>Email verified: {u.emailVerified ? '✅' : '❌'}</p>
              {u.banReason && <p className="text-rose-400">Ban reason: {u.banReason}</p>}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Matches" value={u.stats?.matchesPlayed ?? 0} icon={<Swords className="h-4 w-4" />} />
            <StatCard label="Tournaments" value={data.activity?.registrations ?? 0} icon={<Trophy className="h-4 w-4" />} tone="purple" />
            <StatCard label="Payments" value={data.activity?.payments ?? 0} icon={<CreditCard className="h-4 w-4" />} tone="lime" />
            <StatCard label="Earnings" value={formatCurrency(u.stats?.earnings ?? 0)} icon={<Activity className="h-4 w-4" />} tone="pink" />
          </div>

          <Card>
            <CardHeader title="Competitive Stats" subtitle="Career performance" />
            <CardBody>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Wins', value: u.stats?.wins ?? 0 },
                  { label: 'Losses', value: u.stats?.losses ?? 0 },
                  { label: 'Points', value: u.stats?.points ?? 0 },
                  { label: 'Win Streak', value: u.stats?.winStreak ?? 0 },
                ].map((x) => (
                  <div key={x.label} className="rounded-xl bg-white/[0.03] p-4 text-center">
                    <p className="font-display text-2xl font-bold text-white">{x.value}</p>
                    <p className="text-xs text-slate-500">{x.label}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Roles & Access" subtitle="Use the users table to modify" />
            <CardBody>
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <Shield className="mt-0.5 h-4 w-4 text-neon-cyan" />
                <p className="text-sm text-slate-400">
                  Role changes, bans and suspensions are actioned from the{' '}
                  <Link href="/admin/users" className="text-neon-cyan underline">
                    users table
                  </Link>{' '}
                  and every change is written to the audit log with your admin ID.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
