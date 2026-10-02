'use client';

import { useEffect, useState } from 'react';
import { Search, Swords, Trophy, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useToast } from '@/components/ui/toast';
import { StatusBadge, Pagination } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { formatDateTime } from '@/lib/utils';

export default function AdminMatchesPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [winnerSlot, setWinnerSlot] = useState<1 | 2>(1);
  const [score1, setScore1] = useState('2');
  const [score2, setScore2] = useState('0');
  const [walkover, setWalkover] = useState(false);
  const [reason, setReason] = useState('Admin result correction');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const qs = new URLSearchParams();
  if (searchQuery) qs.set('search', searchQuery);
  if (status) qs.set('status', status);
  qs.set('page', String(page));
  qs.set('limit', '25');

  const { data, loading, refetch } = useFetch<any>(`/api/admin/matches?${qs.toString()}`);

  const openEditor = (match: any) => {
    setSelected(match);
    const p1Ref = String(match.participant1?.ref ?? '');
    const p2Ref = String(match.participant2?.ref ?? '');
    const currentWinner = String(match.winner?.ref ?? '');
    setWinnerSlot(currentWinner && currentWinner === p2Ref ? 2 : 1);
    setScore1(String(match.participant1?.score ?? 2));
    setScore2(String(match.participant2?.score ?? 0));
    setWalkover(match.status === 'walkover');
    setReason(match.status === 'completed' || match.status === 'walkover' ? 'Admin result correction' : 'Admin decision');
  };

  const chooseWinner = (slot: 1 | 2) => {
    setWinnerSlot(slot);
    if (walkover) return;
    const a = Number(score1) || 0;
    const b = Number(score2) || 0;
    if (slot === 1 && a <= b) {
      if (b >= 99) {
        setScore1('99');
        setScore2('98');
      } else setScore1(String(b + 1));
    } else if (slot === 2 && b <= a) {
      if (a >= 99) {
        setScore1('98');
        setScore2('99');
      } else setScore2(String(a + 1));
    }
  };

  const saveResult = async () => {
    if (!selected) return;
    const body: Record<string, unknown> = { winnerSlot, reason: reason.trim() || 'Admin result correction' };
    if (!walkover) {
      const a = Number(score1);
      const b = Number(score2);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 99 || b > 99 || a === b) {
        toast.error('Enter a valid score', 'Scores must be different whole numbers between 0 and 99.');
        return;
      }
      if ((winnerSlot === 1 && a < b) || (winnerSlot === 2 && b < a)) {
        toast.error('Winner and score do not match', 'The selected winner must have the higher score.');
        return;
      }
      body.score1 = a;
      body.score2 = b;
    }

    setBusy(true);
    try {
      await api(`/api/matches/${selected._id}/winner`, { body });
      toast.success('Result saved', 'The bracket and rankings were updated.');
      setSelected(null);
      refetch();
    } catch (err) {
      toast.error('Could not save result', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const items = data?.items ?? [];
  const canEdit = (m: any) =>
    m.status !== 'cancelled' &&
    m.participant1?.kind !== 'tbd' && m.participant1?.kind !== 'bye' &&
    m.participant2?.kind !== 'tbd' && m.participant2?.kind !== 'bye' &&
    m.participant1?.ref && m.participant2?.ref;

  return (
    <AppShell section="admin" title="Match Management" subtitle="Find a fixture, set a result, or correct a winner with a clear audit trail.">
      <div className="glass-strong flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search player, team, tournament or match #…"
            className="pl-10"
            aria-label="Search matches"
          />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44" aria-label="Filter match status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="walkover">Walkover</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="glass mt-5 overflow-x-auto">
        <table className="table-base min-w-[920px]">
          <thead>
            <tr>
              <th>Match</th>
              <th>Tournament</th>
              <th>Round</th>
              <th>Players / Teams</th>
              <th>Score</th>
              <th>Winner</th>
              <th>Status</th>
              <th>Scheduled</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j}><Skeleton className="h-5 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState icon={<Swords className="h-8 w-8" />} title="No matches found" body="Try another search or status filter." />
                </td>
              </tr>
            ) : (
              items.map((m: any) => (
                <tr key={m._id}>
                  <td className="font-mono text-xs text-slate-500">#{m.matchNumber}</td>
                  <td className="max-w-[180px] truncate text-white">{m.tournament?.title ?? '—'}</td>
                  <td className="text-slate-300">{m.roundName || `R${m.round}`}</td>
                  <td className="min-w-[200px] text-slate-200">
                    <span className={m.winner?.ref && String(m.winner.ref) === String(m.participant1?.ref) ? 'font-semibold text-emerald-300' : ''}>{m.participant1?.name ?? 'TBD'}</span>
                    <span className="px-2 text-slate-500">vs</span>
                    <span className={m.winner?.ref && String(m.winner.ref) === String(m.participant2?.ref) ? 'font-semibold text-emerald-300' : ''}>{m.participant2?.name ?? 'TBD'}</span>
                  </td>
                  <td className="font-display text-sm font-semibold text-white">
                    {m.participant1?.score ?? 0}–{m.participant2?.score ?? 0}
                  </td>
                  <td className="text-sm text-emerald-300">{m.winner?.name || '—'}</td>
                  <td><StatusBadge status={m.status} /></td>
                  <td className="text-xs text-slate-500">{formatDateTime(m.scheduledAt)}</td>
                  <td>
                    {canEdit(m) ? (
                      <Button size="sm" variant={m.status === 'completed' || m.status === 'walkover' ? 'secondary' : 'ghost'} onClick={() => openEditor(m)}>
                        {m.status === 'completed' || m.status === 'walkover' ? 'Edit result' : 'Set result'}
                      </Button>
                    ) : <span className="text-xs text-slate-600">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <Pagination page={page} pages={Math.max(1, Math.ceil((data?.total ?? 0) / 25))} onChange={setPage} />
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => !busy && setSelected(null)}
        title={selected?.status === 'completed' || selected?.status === 'walkover' ? 'Correct match result' : 'Set match result'}
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{selected.tournament?.title} · Match #{selected.matchNumber}</p>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-white">
                <span className="min-w-0 flex-1 truncate">{selected.participant1?.name}</span>
                <span className="text-xs text-slate-500">VS</span>
                <span className="min-w-0 flex-1 truncate text-right">{selected.participant2?.name}</span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Select the winner</p>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant={winnerSlot === 1 ? 'primary' : 'secondary'} className="min-h-12 normal-case tracking-normal" onClick={() => chooseWinner(1)}>
                  <Trophy className="h-4 w-4" /> {selected.participant1?.name}
                </Button>
                <Button type="button" variant={winnerSlot === 2 ? 'primary' : 'secondary'} className="min-h-12 normal-case tracking-normal" onClick={() => chooseWinner(2)}>
                  <Trophy className="h-4 w-4" /> {selected.participant2?.name}
                </Button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
              <input type="checkbox" checked={walkover} onChange={(e) => setWalkover(e.target.checked)} className="h-4 w-4 accent-neon-cyan" />
              Mark as walkover (no score reported)
            </label>

            {!walkover && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Score — ${selected.participant1?.name}`} htmlFor="score1">
                  <Input id="score1" type="number" min={0} max={99} value={score1} onChange={(e) => setScore1(e.target.value)} />
                </Field>
                <Field label={`Score — ${selected.participant2?.name}`} htmlFor="score2">
                  <Input id="score2" type="number" min={0} max={99} value={score2} onChange={(e) => setScore2(e.target.value)} />
                </Field>
              </div>
            )}

            <Field label="Admin note / correction reason" htmlFor="reason">
              <Input id="reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Why is this result being changed?" />
            </Field>

            <p className="text-xs leading-relaxed text-slate-500">
              Saving updates the bracket, standings, match stats, and tournament winner. A correction is blocked if a later match has already started; correct later matches first. Every change is audit-logged.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSelected(null)} disabled={busy}>Cancel</Button>
              <Button onClick={saveResult} loading={busy}>
                <Trophy className="h-4 w-4" /> Save result
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
