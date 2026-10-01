'use client';

import Link from 'next/link';
import {
  Trophy,
  Swords,
  Target,
  IndianRupee,
  Flame,
  Crown,
  ArrowRight,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge, Avatar } from '@/components/ui/misc';
import { StatCard, Card, CardBody, CardHeader } from '@/components/ui/card';
import { Skeleton, EmptyState, ProgressBar } from '@/components/ui/states';
import { BarChart, LineChart, DonutChart } from '@/components/charts';
import { formatCurrency, formatNumber, formatDate, cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: statsRes, loading } = useFetch<any>('/api/me/stats');
  const { data: tournaments } = useFetch<any>('/api/me/tournaments');
  const { data: matches } = useFetch<any>('/api/me/matches');

  const s = statsRes?.stats;
  const upcomingMatches = (matches?.items ?? [])
    .filter((m: any) => ['scheduled', 'live', 'pending'].includes(m.status))
    .slice(0, 4);
  const recentTournaments = (tournaments?.items ?? []).slice(0, 4);

  return (
    <AppShell title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Player'}`} subtitle="Here's your competitive snapshot at a glance.">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Matches Played"
          value={loading ? <Skeleton className="h-7 w-16" /> : formatNumber(s?.matchesPlayed ?? 0)}
          icon={<Swords className="h-4 w-4" />}
          hint={`${s?.wins ?? 0}W · ${s?.losses ?? 0}L`}
          tone="cyan"
        />
        <StatCard
          label="Win Rate"
          value={loading ? <Skeleton className="h-7 w-16" /> : `${s?.winRate ?? 0}%`}
          icon={<Target className="h-4 w-4" />}
          hint="Across all tournaments"
          tone="lime"
        />
        <StatCard
          label="Total Earnings"
          value={loading ? <Skeleton className="h-7 w-16" /> : formatCurrency(s?.earnings ?? 0)}
          icon={<IndianRupee className="h-4 w-4" />}
          hint="Prize winnings"
          tone="purple"
        />
        <StatCard
          label="Global Rank"
          value={loading ? <Skeleton className="h-7 w-16" /> : s?.rank ? `#${s.rank}` : 'Unranked'}
          icon={<Crown className="h-4 w-4" />}
          hint={`${formatNumber(s?.points ?? 0)} points`}
          tone="pink"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Earnings chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Earnings Overview"
            subtitle="Prize money over the last 6 months"
            action={
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Flame className="h-3.5 w-3.5" /> {s?.winStreak ?? 0} win streak
              </span>
            }
          />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <BarChart
                data={(s?.earningsHistory ?? []).map((d: any) => ({ label: d.month, value: d.amount }))}
                formatValue={(v) => `₹${v}`}
              />
            )}
          </CardBody>
        </Card>

        {/* Win/Loss donut */}
        <Card>
          <CardHeader title="Performance" subtitle="Win / loss split" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <DonutChart
                segments={[
                  { label: 'Wins', value: s?.wins ?? 0, color: '#22c55e' },
                  { label: 'Losses', value: s?.losses ?? 0, color: '#f43f5e' },
                ]}
                centerValue={`${s?.winRate ?? 0}%`}
                centerLabel="win rate"
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Upcoming matches */}
        <Card>
          <CardHeader
            title="Upcoming Matches"
            subtitle="Your next battles"
            action={
              <Link href="/dashboard/my-matches" className="text-xs text-neon-cyan hover:underline">
                View all →
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {loading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : upcomingMatches.length === 0 ? (
              <EmptyState
                title="No upcoming matches"
                body="Register for a tournament to get matched!"
                action={
                  <Link href="/tournaments" className="btn-primary btn-sm mt-1">
                    Browse tournaments
                  </Link>
                }
              />
            ) : (
              upcomingMatches.map((m: any) => {
                const opponent =
                  String(m.participant1?.ref) === user?.id ? m.participant2?.name : m.participant1?.name;
                return (
                  <div
                    key={m._id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={opponent ?? 'TBD'} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-white">vs {opponent ?? 'TBD'}</p>
                        <p className="text-xs text-slate-500">
                          {m.tournament?.title} · {m.roundName || `Round ${m.round}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {m.scheduledAt ? formatDate(m.scheduledAt) : 'TBA'}
                      </p>
                      <StatusBadge status={m.status} className="mt-1" />
                    </div>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        {/* Recent tournaments */}
        <Card>
          <CardHeader
            title="My Tournaments"
            subtitle="Recent registrations"
            action={
              <Link href="/dashboard/my-tournaments" className="text-xs text-neon-cyan hover:underline">
                View all →
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {loading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : recentTournaments.length === 0 ? (
              <EmptyState
                title="No tournaments yet"
                body="Join your first competition today."
                action={
                  <Link href="/tournaments" className="btn-primary btn-sm mt-1">
                    Find tournaments
                  </Link>
                }
              />
            ) : (
              recentTournaments.map((r: any) => (
                <Link
                  key={r._id}
                  href={`/tournaments/${r.tournament?.slug}`}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-neon-cyan/30"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{r.tournament?.title}</p>
                    <p className="text-xs text-slate-500">
                      {r.tournament?.game?.name} · {formatDate(r.tournament?.startsAt)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Win/loss trend + AI promo */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Match Activity" subtitle="Wins vs losses over recent months" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <LineChart
                data={(s?.winLossHistory ?? []).map((d: any) => ({
                  label: d.label,
                  value: d.wins + d.losses,
                }))}
              />
            )}
          </CardBody>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/[0.07] to-neon-purple/[0.09]" />
          <CardBody className="relative">
            <Sparkles className="h-8 w-8 text-neon-purple" />
            <h3 className="mt-4 text-lg font-semibold text-white">AI Tournament Assistant</h3>
            <p className="mt-2 text-sm text-slate-400">
              Ask about your next match, get tournament recommendations or an instant breakdown of
              your stats.
            </p>
            <Link href="/dashboard/assistant" className="btn-primary btn-sm mt-5">
              Open assistant <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { href: '/tournaments', icon: Trophy, label: 'Find Tournaments' },
          { href: '/dashboard/my-matches', icon: Swords, label: 'My Matches' },
          { href: '/leaderboard', icon: Crown, label: 'Leaderboard' },
          { href: '/create-tournament', icon: Calendar, label: 'Host Event' },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="glass glass-hover flex items-center gap-3 p-4">
            <div className="rounded-xl bg-neon-cyan/10 p-2.5">
              <a.icon className="h-4 w-4 text-neon-cyan" />
            </div>
            <span className="text-sm font-medium text-white">{a.label}</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
