'use client';

import { useState } from 'react';
import { Swords, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useToast } from '@/components/ui/toast';
import { StatusBadge, Pagination } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { formatDateTime } from '@/lib/utils';

export default function AdminMatchesPage() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [override, setOverride] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  qs.set('page', String(page));
  qs.set('limit', '25');

  const { data, loading, refetch } = useFetch<any>(`/api/admin/matches?${qs.toString()}`);

  const setWinner = async (winnerSlot: 1 | 2) => {
    if (!override) return;
    setBusy(true);
    try {
      await api(`/api/matches/${override._id}/winner`, {
        body: { winnerSlot, reason: 'Admin override' },
      });
      toast.success('Result recorded');
      setOverride(null);
      refetch();
    } catch (err) {
      toast.error('Failed', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell section="admin" title="Match Management" subtitle="Monitor matches and resolve disputes.">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input placeholder="Search matches…" className="pl-10" />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="walkover">Walkover</option>
        </Select>
      </div>

      <div className="glass mt-6 overflow-x-auto">
        <table className="table-base min-w-[880px]">
          <thead>
            <tr>
              <th>Match</th>
              <th>Tournament</th>
              <th>Round</th>
              <th>Players</th>
              <th>Score</th>
              <th>Status</th>
              <th>Scheduled</th>
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
                  <EmptyState icon={<Swords className="h-8 w-8" />} title="No matches" />
                </td>
              </tr>
            ) : (
              (data?.items ?? []).map((m: any) => (
                <tr key={m._id}>
                  <td className="font-mono text-xs text-slate-500">#{m.matchNumber}</td>
                  <td className="text-white">{m.tournament?.title}</td>
                  <td className="text-slate-300">{m.roundName || `R${m.round}`}</td>
                  <td className="text-slate-200">
                    {m.participant1?.name} <span className="text-slate-600">vs</span>{' '}
                    {m.participant2?.name}
                  </td>
                  <td className="font-display text-sm font-semibold text-white">
                    {m.participant1?.score ?? 0}-{m.participant2?.score ?? 0}
                  </td>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="text-xs text-slate-500">{formatDateTime(m.scheduledAt)}</td>
                  <td>
                    {['pending', 'scheduled', 'live'].includes(m.status) &&
                      m.participant1?.name !== 'TBD' &&
                      m.participant2?.name !== 'TBD' && (
                        <Button size="sm" variant="ghost" onClick={() => setOverride(m)}>
                          Set winner
                        </Button>
                      )}
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

      <Modal
        open={Boolean(override)}
        onClose={() => setOverride(null)}
        title="Set match winner (walkover)"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            This overrides the match result and advances the selected participant. The action is
            audit-logged.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => setWinner(1)} loading={busy} variant="secondary">
              {override?.participant1?.name ?? 'Player 1'} wins
            </Button>
            <Button onClick={() => setWinner(2)} loading={busy} variant="secondary">
              {override?.participant2?.name ?? 'Player 2'} wins
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
