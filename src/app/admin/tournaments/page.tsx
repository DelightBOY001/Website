'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Trophy, Search, ExternalLink, Play, Square } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useToast } from '@/components/ui/toast';
import { StatusBadge, FormatBadge, Tabs, Pagination } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminTournamentsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (status) qs.set('status', status);
  qs.set('page', String(page));
  qs.set('limit', '20');

  const { data, loading, refetch } = useFetch<any>(`/api/admin/tournaments?${qs.toString()}`);

  const setStatusAction = async (id: string, action: 'start' | 'end') => {
    try {
      await api(`/api/tournaments/${id}/${action}`, {});
      toast.success(action === 'start' ? 'Tournament started' : 'Tournament ended');
      refetch();
    } catch (err) {
      toast.error('Action failed', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <AppShell
      section="admin"
      title="Tournaments"
      subtitle="Manage every event on the platform."
      actions={
        <Link href="/create-tournament" className="btn-primary btn-sm">
          Create Tournament
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search tournaments…"
            className="pl-10"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-44"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="registration">Registration</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      <div className="glass mt-6 overflow-x-auto">
        <table className="table-base min-w-[900px]">
          <thead>
            <tr>
              <th>Tournament</th>
              <th>Format</th>
              <th>Entry</th>
              <th>Prize</th>
              <th>Players</th>
              <th>Starts</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (data?.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState icon={<Trophy className="h-8 w-8" />} title="No tournaments" />
                </td>
              </tr>
            ) : (
              (data?.items ?? []).map((t: any) => (
                <tr key={t._id}>
                  <td>
                    <Link
                      href={`/tournaments/${t.slug}`}
                      className="flex items-center gap-2 font-medium text-white hover:text-neon-cyan"
                    >
                      {t.title}
                      <ExternalLink className="h-3 w-3 text-slate-600" />
                    </Link>
                    <p className="text-xs text-slate-500">
                      {t.game?.name} · by {t.organizer?.name ?? '—'}
                    </p>
                  </td>
                  <td>
                    <FormatBadge format={t.format} />
                  </td>
                  <td className="text-slate-300">
                    {t.entryFee === 0 ? 'Free' : formatCurrency(t.entryFee)}
                  </td>
                  <td className="text-neon-cyan">{formatCurrency(t.prizePool ?? 0)}</td>
                  <td className="text-slate-300">
                    {t.participantsCount}/{t.maxParticipants}
                  </td>
                  <td className="text-xs text-slate-500">{formatDate(t.startsAt)}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      {(t.status === 'registration' || t.status === 'upcoming') && (
                        <button
                          onClick={() => setStatusAction(t._id, 'start')}
                          className="rounded-lg border border-emerald-500/20 p-1.5 text-emerald-400 transition hover:bg-emerald-500/10"
                          title="Start tournament"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {t.status === 'ongoing' && (
                        <button
                          onClick={() => setStatusAction(t._id, 'end')}
                          className="rounded-lg border border-amber-500/20 p-1.5 text-amber-400 transition hover:bg-amber-500/10"
                          title="End tournament"
                        >
                          <Square className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Pagination page={page} pages={data?.pages ?? 1} onChange={setPage} />
      </div>
    </AppShell>
  );
}
