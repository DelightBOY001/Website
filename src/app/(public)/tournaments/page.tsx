'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { Search, SlidersHorizontal, Trophy, X } from 'lucide-react';
import { TournamentCard, type TournamentCardData } from '@/components/tournament-card';
import { SkeletonCards, EmptyState, ErrorState } from '@/components/ui/states';
import { Pagination, Tabs } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const FORMATS = [
  { value: '', label: 'All formats' },
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'swiss', label: 'Swiss' },
  { value: 'group_knockout', label: 'Groups + Playoffs' },
];

const SORTS = [
  { value: 'soonest', label: 'Starting soonest' },
  { value: 'newest', label: 'Newest' },
  { value: 'prize', label: 'Highest prize' },
  { value: 'entryFee', label: 'Lowest entry fee' },
  { value: 'popular', label: 'Most popular' },
];

interface ListResponse {
  items: TournamentCardData[];
  total: number;
  page: number;
  pages: number;
}

function TournamentsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const status = params.get('status') ?? '';
  const game = params.get('game') ?? '';
  const format = params.get('format') ?? '';
  const type = params.get('type') ?? '';
  const search = params.get('search') ?? '';
  const sort = params.get('sort') ?? 'soonest';
  const page = Number(params.get('page') ?? 1);
  const feeMax = params.get('entryFeeMax') ?? '';

  const [searchInput, setSearchInput] = useState(search);

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      router.push(`/tournaments?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (status && status !== 'live') qs.set('status', status);
    if (status === 'live') qs.set('status', 'live');
    if (game) qs.set('game', game);
    if (format) qs.set('format', format);
    if (type) qs.set('type', type);
    if (search) qs.set('search', search);
    if (sort) qs.set('sort', sort);
    if (feeMax) qs.set('entryFeeMax', feeMax);
    qs.set('page', String(page));
    qs.set('limit', '12');

    fetch(`/api/tournaments?${qs.toString()}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error?.message ?? `Request failed (${r.status})`);
        return j;
      })
      .then((j) => {
        if (alive) {
          setData(j);
          setError('');
        }
      })
      .catch((err) => {
        if (alive) {
          setData(null);
          setError(err instanceof Error && err.message ? err.message : 'Could not load tournaments.');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [status, game, format, type, search, sort, page, feeMax]);

  const activeFilters = [game, format, type, feeMax].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-cyan">
            The battlefield awaits
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Tournaments</h1>
          <p className="mt-2 max-w-lg text-sm text-slate-400">
            Discover competitions across every major esports title — filter by game, format,
            entry fee and more.
          </p>
        </div>

        <div className="flex w-full max-w-md items-center gap-2 sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setParam('search', searchInput)}
              placeholder="Search tournaments…"
              className="pl-10"
            />
          </div>
          <Button variant="secondary" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilters > 0 && (
              <span className="ml-1 rounded-full bg-neon-cyan px-1.5 text-[10px] font-bold text-void-950">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="glass animate-fade-up mt-6 p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Game">
              <Select value={game} onChange={(e) => setParam('game', e.target.value)}>
                <option value="">All games</option>
                <option value="valorant">Valorant</option>
                <option value="bgmi">BGMI</option>
                <option value="free-fire">Free Fire</option>
                <option value="cs2">CS2</option>
                <option value="league-of-legends">League of Legends</option>
                <option value="cod-mobile">COD Mobile</option>
              </Select>
            </Field>
            <Field label="Format">
              <Select value={format} onChange={(e) => setParam('format', e.target.value)}>
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={type} onChange={(e) => setParam('type', e.target.value)}>
                <option value="">Solo & Team</option>
                <option value="solo">Solo</option>
                <option value="duo">Duo</option>
                <option value="team">Team</option>
              </Select>
            </Field>
            <Field label="Max entry fee">
              <Select value={feeMax} onChange={(e) => setParam('entryFeeMax', e.target.value)}>
                <option value="">Any</option>
                <option value="0">Free only</option>
                <option value="100">Under ₹100</option>
                <option value="500">Under ₹500</option>
                <option value="1000">Under ₹1,000</option>
              </Select>
            </Field>
            <Field label="Sort by">
              <Select value={sort} onChange={(e) => setParam('sort', e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {activeFilters > 0 && (
            <button
              onClick={() => router.push('/tournaments')}
              className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-white"
            >
              <X className="h-3.5 w-3.5" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Status tabs */}
      <div className="mt-8">
        <Tabs
          tabs={[
            { id: '', label: 'All' },
            { id: 'registration', label: 'Open' },
            { id: 'live', label: 'Live' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
          ]}
          active={status}
          onChange={(v) => setParam('status', v)}
        />
      </div>

      {/* Results */}
      <div className="mt-8">
        {loading ? (
          <SkeletonCards count={6} />
        ) : error ? (
          <ErrorState body={error} onRetry={() => setParam('page', String(page))} />
        ) : (data?.items?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Trophy className="h-8 w-8" />}
            title="No tournaments found"
            body="Try adjusting your filters — or create your own tournament and lead the way."
            action={
              <a href="/create-tournament" className="btn-primary mt-2">
                Create Tournament
              </a>
            }
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data?.items?.map((t, i) => (
                <div key={t._id} className={cn('animate-fade-up', `delay-${Math.min(i, 4)}00`)}>
                  <TournamentCard t={t} />
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Pagination
                page={page}
                pages={data?.pages ?? 1}
                onChange={(p) => setParam('page', String(p))}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TournamentsPage() {
  return (
    <Suspense>
      <TournamentsContent />
    </Suspense>
  );
}
