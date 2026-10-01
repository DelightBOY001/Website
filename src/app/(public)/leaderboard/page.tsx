'use client';

import { useState } from 'react';
import { Trophy, TrendingUp, Medal, Crown, Filter } from 'lucide-react';
import { useFetch } from '@/hooks/useData';
import { Skeleton, EmptyState, ErrorState, ProgressBar } from '@/components/ui/states';
import { Tabs, Avatar } from '@/components/ui/misc';
import { Select } from '@/components/ui/input';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import type { LeaderboardRow } from '@/types';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [scope, setScope] = useState('global');
  const [season, setSeason] = useState('');
  const [game, setGame] = useState('');

  const qs = new URLSearchParams();
  if (game) qs.set('game', game);
  if (season) qs.set('season', season);
  qs.set('limit', '50');

  const { data, loading, error, refetch } = useFetch<{ rows: LeaderboardRow[]; total: number }>(
    `/api/leaderboard?${qs.toString()}`,
    [scope],
  );

  const rows = data?.rows ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-cyan">
          Season 2026 standings
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
          Leaderboard & <span className="text-gradient">Rankings</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          The best competitors across every title — ranked by points, wins and earnings.
        </p>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: 'global', label: 'Global' },
            { id: 'game', label: 'By Game' },
          ]}
          active={scope}
          onChange={(id) => {
            setScope(id);
            if (id === 'global') setGame('');
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          {scope === 'game' && (
            <Select value={game} onChange={(e) => setGame(e.target.value)} className="w-44">
              <option value="">Select game…</option>
              <option value="valorant">Valorant</option>
              <option value="bgmi">BGMI</option>
              <option value="cs2">CS2</option>
              <option value="free-fire">Free Fire</option>
            </Select>
          )}
          <Select value={season} onChange={(e) => setSeason(e.target.value)} className="w-36">
            <option value="">Current season</option>
            <option value="2026-Q3">2026 Q3</option>
            <option value="2026-Q2">2026 Q2</option>
          </Select>
        </div>
      </div>

      {/* Podium */}
      {loading ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : rows.length >= 3 ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:items-end">
          {[rows[1], rows[0], rows[2]].map((r, idx) => {
            const place = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            return (
              <Link
                key={r.user?._id ?? ''}
                href={`/players/${r.user?.username || r.user?._id || ''}`}
                className={cn(
                  'glass glass-hover relative overflow-hidden p-6 text-center',
                  place === 1 && 'sm:-translate-y-4 border-amber-400/30',
                )}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent" />
                {place === 1 ? (
                  <Crown className="mx-auto h-8 w-8 text-amber-300" />
                ) : place === 2 ? (
                  <Medal className="mx-auto h-7 w-7 text-slate-300" />
                ) : (
                  <Medal className="mx-auto h-7 w-7 text-orange-400" />
                )}
                <p className="mt-2 font-display text-xs font-bold uppercase tracking-wider text-slate-500">
                  {place === 1 ? 'Champion' : place === 2 ? 'Runner-up' : 'Third Place'}
                </p>
                <div className="mt-4 flex justify-center">
                  <Avatar name={r.user?.name ?? 'Player'} src={r.user?.avatar} color={r.user?.avatarColor} size="lg" />
                </div>
                <p className="mt-3 font-semibold text-white">{r.user?.name ?? 'Player'}</p>
                <p className="text-xs text-slate-500">{r.user?.playerId ?? '—'}</p>
                <p className="mt-3 font-display text-2xl font-bold text-neon-cyan">
                  {formatNumber(r.points)}
                  <span className="ml-1 text-xs font-normal text-slate-500">pts</span>
                </p>
                <div className="mt-3 flex justify-center gap-3 text-xs text-slate-400">
                  <span className="text-emerald-400">{r.wins}W</span>
                  <span className="text-rose-400">{r.losses}L</span>
                  <span>{formatCurrency(r.earnings)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {/* Table */}
      <div className="glass mt-10 overflow-x-auto">
        <table className="table-base min-w-[820px]">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Matches</th>
              <th>W / L</th>
              <th>Win Rate</th>
              <th>Tournaments</th>
              <th>Earnings</th>
              <th>Points</th>
              <th>Form</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={9} className="py-8 text-center">
                  <ErrorState body={error} onRetry={refetch} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon={<Trophy className="h-8 w-8" />}
                    title="No rankings yet"
                    body="Complete your first tournament matches to appear on the leaderboard."
                  />
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.user?._id ?? ''}>
                  <td>
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg font-display text-sm font-bold',
                        r.rank <= 3 ? 'bg-amber-400/12 text-amber-300' : 'text-slate-400',
                      )}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/players/${r.user?.username || r.user?._id || ''}`}
                      className="flex items-center gap-3 transition hover:text-neon-cyan"
                    >
                      <Avatar name={r.user?.name ?? 'Player'} src={r.user?.avatar} color={r.user?.avatarColor} size="sm" />
                      <div>
                        <p className="font-medium text-white">{r.user?.name ?? 'Player'}</p>
                        <p className="text-xs text-slate-500">{r.user?.playerId ?? '—'}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="text-slate-300">{r.matchesPlayed}</td>
                  <td>
                    <span className="text-emerald-400">{r.wins}W</span>{' '}
                    <span className="text-rose-400">{r.losses}L</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16">
                        <ProgressBar value={r.winRate} tone={r.winRate >= 50 ? 'lime' : 'pink'} />
                      </div>
                      <span className="text-xs text-slate-400">{r.winRate}%</span>
                    </div>
                  </td>
                  <td className="text-slate-300">{r.tournamentsPlayed}</td>
                  <td className="font-semibold text-neon-cyan">{formatCurrency(r.earnings)}</td>
                  <td className="font-display font-bold text-white">{formatNumber(r.points)}</td>
                  <td>
                    <div className="flex gap-1">
                      {(r.form ?? []).slice(-5).map((f, i) => (
                        <span
                          key={i}
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold',
                            f === 'W'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : f === 'D'
                                ? 'bg-slate-500/15 text-slate-400'
                                : 'bg-rose-500/15 text-rose-400',
                          )}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
        <TrendingUp className="h-4 w-4" />
        Rankings update automatically after every completed match
      </div>
    </div>
  );
}
