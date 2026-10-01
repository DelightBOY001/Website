'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { ChevronLeft, Swords, Trophy, Users } from 'lucide-react';
import { useFetch } from '@/hooks/useData';
import { useRealtime } from '@/hooks/useRealtime';
import { BracketViewComponent } from '@/components/bracket-view';
import { PageLoader, ErrorState, EmptyState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/misc';
import type { BracketView } from '@/types';

interface BracketResponse {
  tournament: any;
  bracket: BracketView | null;
  matches: any[];
}

export default function TournamentBracketPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error, refetch } = useFetch<BracketResponse>(
    slug ? `/api/tournaments/${slug}` : null,
  );

  useRealtime(
    data?.tournament?._id ? ['global', `tournament:${data.tournament._id}`] : [],
    useCallback(
      (e: { type: string; payload?: unknown }) => {
        if (['match:completed', 'bracket:generated', 'tournament:updated'].includes(e.type)) refetch();
      },
      [refetch],
    ),
  );

  if (loading) return <PageLoader label="Loading bracket…" />;
  if (error || !data?.tournament)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState onRetry={refetch} body={error ?? 'Tournament not found.'} />
      </div>
    );

  const t = data.tournament;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      <Link
        href={`/tournaments/${t.slug}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-neon-cyan"
      >
        <ChevronLeft className="h-4 w-4" /> {t.title}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Tournament Bracket</h1>
            <StatusBadge status={t.status} />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-300" /> {t.format.replace(/_/g, ' ')}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-neon-cyan" /> {t.participantsCount} participants
            </span>
            <span className="flex items-center gap-1.5">
              <Swords className="h-4 w-4 text-neon-purple" />{' '}
              {data.matches?.filter((m: any) => m.status === 'completed').length ?? 0} matches played
            </span>
          </div>
        </div>

        {t.winner?.name && (
          <div className="glass flex items-center gap-3 border-amber-400/25 px-5 py-3">
            <Trophy className="h-6 w-6 text-amber-300" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
                Champion
              </p>
              <p className="font-display text-lg font-bold text-white">{t.winner.name}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        {data.bracket ? (
          <BracketViewComponent bracket={data.bracket} liveMode={t.status === 'ongoing'} />
        ) : (
          <EmptyState
            icon={<Swords className="h-8 w-8" />}
            title="Bracket coming soon"
            body="The bracket will appear here once the organizer generates it."
          />
        )}
      </div>

      {data?.matches?.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-white">All Matches</h2>
          <div className="glass mt-4 overflow-x-auto">
            <table className="table-base min-w-[720px]">
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Round</th>
                  <th>Players</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {data?.matches?.map((m: any) => (
                  <tr key={m._id}>
                    <td className="font-mono text-xs text-slate-500">#{m.matchNumber}</td>
                    <td className="text-slate-300">{m.roundName || `Round ${m.round}`}</td>
                    <td className="text-slate-200">
                      {m.participant1?.name} <span className="text-slate-600">vs</span>{' '}
                      {m.participant2?.name}
                    </td>
                    <td className="font-display font-semibold text-white">
                      {m.participant1?.score ?? 0} - {m.participant2?.score ?? 0}
                    </td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="text-xs text-slate-500">
                      {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('en-IN') : 'TBA'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
