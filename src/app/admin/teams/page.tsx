'use client';

import { useState } from 'react';
import { Users, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch } from '@/hooks/useData';
import { Avatar, StatusBadge, Pagination } from '@/components/ui/misc';
import { Input } from '@/components/ui/input';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminTeamsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  qs.set('page', String(page));
  qs.set('limit', '25');

  const { data, loading } = useFetch<any>(`/api/teams?${qs.toString()}`);

  return (
    <AppShell section="admin" title="Teams" subtitle="All squads on the platform.">
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams…"
          className="pl-10"
        />
      </div>

      <div className="glass mt-6 overflow-x-auto">
        <table className="table-base min-w-[820px]">
          <thead>
            <tr>
              <th>Team</th>
              <th>Captain</th>
              <th>Members</th>
              <th>W / L</th>
              <th>Earnings</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (data?.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon={<Users className="h-8 w-8" />} title="No teams" />
                </td>
              </tr>
            ) : (
              (data?.items ?? []).map((t: any) => (
                <tr key={t._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ background: `${t.color ?? '#8b5cf6'}33`, border: `1px solid ${t.color ?? '#8b5cf6'}55` }}
                      >
                        {(t.tag || t.name).slice(0, 3)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{t.name}</p>
                        <p className="text-xs text-slate-500">{t.game?.name ?? 'Multi-game'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={t.captain?.name ?? '—'} src={t.captain?.avatar} size="xs" />
                      <span className="text-slate-300">{t.captain?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="text-slate-300">
                    {t.members?.filter((m: any) => m.status === 'active').length ?? 0}/{t.maxSize}
                  </td>
                  <td>
                    <span className="text-emerald-400">{t.stats?.wins ?? 0}W</span>{' '}
                    <span className="text-rose-400">{t.stats?.losses ?? 0}L</span>
                  </td>
                  <td className="text-neon-cyan">{formatCurrency(t.stats?.earnings ?? 0)}</td>
                  <td className="text-xs text-slate-500">{formatDate(t.createdAt)}</td>
                  <td>
                    <StatusBadge status={t.disbanded ? 'cancelled' : 'active'} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Pagination page={page} pages={Math.ceil((data?.total ?? 0) / 25)} onChange={setPage} />
      </div>
    </AppShell>
  );
}
