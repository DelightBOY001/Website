'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Swords, Clock, Trophy, Radio } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { StatusBadge, Tabs, Avatar } from '@/components/ui/misc';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { formatDate, cn } from '@/lib/utils';

export default function MyMatchesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('upcoming');
  const { data, loading, refetch } = useFetch<any>('/api/me/matches');
  const [reportMatch, setReportMatch] = useState<any>(null);
  const [score1, setScore1] = useState('0');
  const [score2, setScore2] = useState('0');
  const [busy, setBusy] = useState(false);

  const items = (data?.items ?? []).filter((m: any) => {
    if (tab === 'upcoming') return ['scheduled', 'live', 'pending'].includes(m.status);
    if (tab === 'completed') return ['completed', 'walkover'].includes(m.status);
    return true;
  });

  const submitResult = async () => {
    if (!reportMatch) return;
    setBusy(true);
    try {
      await api(`/api/matches/${reportMatch._id}/report`, {
        body: { score1: Number(score1), score2: Number(score2) },
      });
      toast.success('Result submitted!', 'Bracket and stats updated.');
      setReportMatch(null);
      refetch();
    } catch (err) {
      toast.error('Could not submit', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="My Matches" subtitle="Upcoming battles and match history.">
      <Tabs
        tabs={[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'completed', label: 'Completed' },
          { id: 'all', label: 'All' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6 space-y-4">
        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Swords className="h-8 w-8" />}
            title="No matches found"
            body="Your matches will appear here once brackets are generated."
            action={
              <Link href="/tournaments" className="btn-primary mt-1">
                Find a tournament
              </Link>
            }
          />
        ) : (
          items.map((m: any) => {
            const isP1 = String(m.participant1?.ref) === user?.id;
            const me = isP1 ? m.participant1 : m.participant2;
            const opp = isP1 ? m.participant2 : m.participant1;
            const won = String(m.winner?.ref) === user?.id;
            return (
              <div
                key={m._id}
                className={cn(
                  'glass relative overflow-hidden p-5',
                  m.status === 'live' && 'border-red-500/30',
                )}
              >
                {m.status === 'live' && (
                  <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-red-500 to-rose-400" />
                )}
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex min-w-[260px] flex-1 items-center gap-4">
                    <Avatar name={me?.name ?? 'You'} src={me?.logo} size="md" />
                    <div className="text-center">
                      <p className="font-display text-2xl font-bold text-white">
                        {m.participant1?.score ?? 0} <span className="text-slate-600">:</span>{' '}
                        {m.participant2?.score ?? 0}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        {m.format?.toUpperCase()}
                      </p>
                    </div>
                    <Avatar name={opp?.name ?? 'TBD'} src={opp?.logo} size="md" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {isP1 ? m.participant1?.name : m.participant2?.name}{' '}
                        <span className="text-slate-600">vs</span> {opp?.name ?? 'TBD'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {m.tournament?.title} · {m.roundName || `Round ${m.round}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={m.status} />
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {m.scheduledAt ? formatDate(m.scheduledAt) : 'Scheduling…'}
                    </span>
                    {['completed', 'walkover'].includes(m.status) && (
                      <span
                        className={cn(
                          'flex items-center gap-1 text-xs font-semibold',
                          won ? 'text-emerald-400' : 'text-rose-400',
                        )}
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        {won ? 'Victory' : 'Defeat'}
                      </span>
                    )}
                  </div>
                </div>

                {(m.status === 'live' || m.status === 'scheduled') && opp?.name && opp.name !== 'TBD' && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setReportMatch(m);
                        setScore1(String(isP1 ? 1 : 0));
                        setScore2(String(isP1 ? 0 : 1));
                      }}
                    >
                      Report Result
                    </Button>
                    <Link
                      href={`/tournaments/${m.tournament?.slug}/bracket`}
                      className="btn-ghost btn-sm"
                    >
                      View bracket →
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal
        open={Boolean(reportMatch)}
        onClose={() => setReportMatch(null)}
        title="Report match result"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Enter the final series score. Both players should agree — moderators resolve disputes.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label={reportMatch?.participant1?.name ?? 'Player 1'}>
              <Input
                type="number"
                min={0}
                max={9}
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
              />
            </Field>
            <Field label={reportMatch?.participant2?.name ?? 'Player 2'}>
              <Input
                type="number"
                min={0}
                max={9}
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
              />
            </Field>
          </div>
          <Button onClick={submitResult} loading={busy} className="w-full">
            SUBMIT RESULT
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
