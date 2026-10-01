'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Trophy, Swords, Target, TrendingUp, ArrowLeft, Award } from 'lucide-react';
import { useFetch } from '@/hooks/useData';
import { PageLoader, ErrorState, ProgressBar } from '@/components/ui/states';
import { Avatar, StatusBadge, RoleBadge } from '@/components/ui/misc';
import { DonutChart } from '@/components/charts';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, refetch } = useFetch<any>(id ? `/api/users/${id}` : null);

  if (loading) return <PageLoader label="Loading player…" />;
  if (error || !data?.user)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState onRetry={refetch} body={error ?? 'Player not found.'} />
      </div>
    );

  const u = data.user;
  const s = u.stats ?? {};
  const played = (s.wins ?? 0) + (s.losses ?? 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/leaderboard"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-neon-cyan"
      >
        <ArrowLeft className="h-4 w-4" /> Leaderboard
      </Link>

      <div className="glass-strong overflow-hidden">
        <div
          className="h-36"
          style={{
            background: `radial-gradient(ellipse 100% 130% at 20% 0%, ${u.avatarColor ?? '#00f0ff'}33, transparent 60%), #0d1022`,
          }}
        />
        <div className="px-8 pb-8">
          <div className="-mt-12 flex flex-wrap items-end gap-5">
            <Avatar name={u.name} src={u.avatar} color={u.avatarColor} size="lg" className="ring-4 ring-void-950 !h-24 !w-24 !text-2xl" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-3xl font-bold text-white">{u.name}</h1>
                <RoleBadge role={u.role} />
              </div>
              <p className="mt-1 text-sm text-slate-400">
                @{u.username} · <span className="font-mono text-neon-cyan">{u.playerId}</span> ·{' '}
                {u.country} · joined {formatDate(u.createdAt)}
              </p>
            </div>
          </div>

          {u.bio && <p className="mt-5 max-w-2xl text-sm text-slate-400">{u.bio}</p>}

          {/* Stats grid */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Matches Played', value: played, icon: Swords },
              { label: 'Tournaments', value: s.tournamentsPlayed ?? 0, icon: Trophy },
              { label: 'Win Rate', value: played ? `${Math.round(((s.wins ?? 0) / played) * 100)}%` : '—', icon: Target },
              { label: 'Earnings', value: formatCurrency(s.earnings ?? 0), icon: TrendingUp },
            ].map((x) => (
              <div key={x.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <x.icon className="h-4 w-4 text-neon-cyan/70" />
                <p className="mt-2 font-display text-2xl font-bold text-white">{x.value}</p>
                <p className="text-xs text-slate-500">{x.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-white">Performance</h2>
              <div className="mt-5">
                <DonutChart
                  segments={[
                    { label: 'Wins', value: s.wins ?? 0, color: '#22c55e' },
                    { label: 'Losses', value: s.losses ?? 0, color: '#f43f5e' },
                    { label: 'Draws', value: s.draws ?? 0, color: '#64748b' },
                  ]}
                  centerValue={String(played)}
                  centerLabel="matches"
                />
              </div>
              <div className="mt-6 space-y-3">
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                    <span>Current win streak</span>
                    <span className="text-neon-cyan">{s.winStreak ?? 0}</span>
                  </div>
                  <ProgressBar value={Math.min(s.winStreak ?? 0, 10)} max={10} tone="cyan" />
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                    <span>Best win streak</span>
                    <span className="text-neon-purple">{s.bestWinStreak ?? 0}</span>
                  </div>
                  <ProgressBar value={Math.min(s.bestWinStreak ?? 0, 10)} max={10} tone="purple" />
                </div>
              </div>
            </div>

            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-white">Achievements</h2>
              <div className="mt-5 space-y-3">
                {(data.achievements ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No achievements unlocked yet — win tournaments to earn badges!
                  </p>
                ) : (
                  (data.achievements ?? []).map((a: any) => (
                    <div
                      key={a._id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                    >
                      <div className="rounded-lg bg-amber-500/12 p-2">
                        <Award className="h-4 w-4 text-amber-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{a.title}</p>
                        <p className="text-xs text-slate-500">{a.description}</p>
                      </div>
                      <span
                        className={cn(
                          'badge ml-auto',
                          a.rarity === 'legendary'
                            ? 'bg-amber-500/12 text-amber-300 border-amber-400/25'
                            : a.rarity === 'epic'
                              ? 'bg-violet-500/12 text-violet-300 border-violet-400/25'
                              : 'bg-white/[0.05] text-slate-400 border-white/10',
                        )}
                      >
                        {a.rarity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent matches */}
          <h2 className="mt-10 text-lg font-semibold text-white">Recent Matches</h2>
          <div className="mt-4 space-y-2">
            {(data.recentMatches ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No completed matches yet.</p>
            ) : (
              (data.recentMatches ?? []).map((m: any) => (
                <div
                  key={m._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-white">
                      {m.participant1?.name}{' '}
                      <span className="mx-1.5 text-slate-600">vs</span> {m.participant2?.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {m.tournament?.title} · {m.roundName || `Round ${m.round}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-bold text-white">
                      {m.participant1?.score ?? 0} - {m.participant2?.score ?? 0}
                    </span>
                    <StatusBadge status={m.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
