'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Trophy, ExternalLink, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch } from '@/hooks/useData';
import { StatusBadge, FormatBadge, Tabs, Avatar } from '@/components/ui/misc';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

export default function MyTournamentsPage() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const { data, loading } = useFetch<any>('/api/me/tournaments');

  const items = (data?.items ?? []).filter((r: any) => {
    const t = r.tournament;
    if (!t) return false;
    if (tab === 'active' && !['registration', 'upcoming', 'ongoing'].includes(r.status)) return false;
    if (tab === 'completed' && r.status !== 'confirmed') return false;
    if (tab === 'cancelled' && r.status !== 'cancelled') return false;
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell title="My Tournaments" subtitle="Every event you've registered for.">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search my tournaments…"
            className="pl-10"
          />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-8 w-8" />}
            title="No tournaments here"
            body="Join a tournament and it will show up in this list."
            action={
              <Link href="/tournaments" className="btn-primary mt-1">
                Browse Tournaments
              </Link>
            }
          />
        ) : (
          items.map((r: any) => {
            const t = r.tournament;
            return (
              <Link
                key={r._id}
                href={`/tournaments/${t.slug}`}
                className="glass glass-hover flex flex-wrap items-center gap-5 p-5"
              >
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${t.game?.accentColor ?? '#62dce7'}33, transparent)`,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <Trophy className="h-7 w-7 text-neon-cyan" />
                </div>
                <div className="min-w-[200px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{t.title}</h3>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.game?.name} · {formatDate(t.startsAt)} ·{' '}
                    {t.entryFee === 0 ? 'Free entry' : formatCurrency(t.entryFee)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <FormatBadge format={t.format} />
                    <span className="text-xs text-slate-500">
                      Reg ID: <span className="font-mono text-neon-cyan">{r.registrationId}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={r.status} />
                  <ExternalLink className="h-4 w-4 text-slate-500" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
