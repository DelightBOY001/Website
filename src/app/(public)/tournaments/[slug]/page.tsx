'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Trophy,
  Users,
  Calendar,
  MapPin,
  Gamepad2,
  Shield,
  IndianRupee,
  Clock,
  Share2,
  Swords,
  ScrollText,
  Info,
  Radio,
} from 'lucide-react';
import { useFetch, api } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { StatusBadge, FormatBadge, PrizeRow, Avatar, RoleBadge } from '@/components/ui/misc';
import { PageLoader, ErrorState, ProgressBar, EmptyState } from '@/components/ui/states';
import { Modal, ConfirmDialog } from '@/components/ui/dialog';
import { Tabs } from '@/components/ui/misc';
import { formatCurrency, formatDateTime, cn, timeAgo } from '@/lib/utils';
import { BracketViewComponent } from '@/components/bracket-view';
import { useRealtime } from '@/hooks/useRealtime';
import type { BracketView } from '@/types';

interface TournamentDetail {
  tournament: any;
  participants: any[];
  bracket: BracketView | null;
  matches: any[];
  userRegistration: any;
  viewer: any;
}

export default function TournamentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch<TournamentDetail>(
    slug ? `/api/tournaments/${slug}` : null,
  );
  const [tab, setTab] = useState('overview');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Live refresh on realtime events.
  useRealtime(
    data ? ['global', `tournament:${data.tournament?._id}`] : [],
    useCallback(
      (e: { type: string; payload?: unknown }) => {
        if (
          ['match:completed', 'bracket:generated', 'registration:new', 'registration:cancelled', 'tournament:updated', 'tournament:completed', 'announcement:new'].includes(
            e.type,
          )
        ) {
          refetch();
        }
      },
      [refetch],
    ),
  );

  useEffect(() => {
    if (!data?.tournament?._id) return;
    fetch(`/api/tournaments/${data.tournament._id}/announcements`)
      .then((r) => r.json())
      .then((j) => setAnnouncements(j?.items ?? []))
      .catch(() => undefined);
  }, [data?.tournament?._id]);

  const t = data?.tournament;
  const reg = data?.userRegistration;

  const cancelRegistration = async () => {
    if (!reg) return;
    setCancelLoading(true);
    try {
      await api(`/api/tournaments/${t._id}/unregister`, {
        body: { registrationId: reg._id, reason: 'Cancelled by player' },
      });
      toast.success('Registration cancelled');
      setCancelOpen(false);
      refetch();
    } catch (err) {
      toast.error('Could not cancel', err instanceof Error ? err.message : undefined);
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) return <PageLoader label="Loading tournament…" />;
  if (error || !t)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Tournament not found"
          body={error ?? 'This tournament may have been removed.'}
          onRetry={refetch}
        />
      </div>
    );

  const isOrganizer = user && String(t.organizer?._id ?? t.organizer) === user.id;
  const canManage = isOrganizer || ['moderator', 'admin', 'super_admin'].includes(user?.role ?? '');
  const registrationOpen = t.status === 'registration' && t.registrationOpen;
  const slotsLeft = t.maxParticipants - t.participantsCount;

  return (
    <div>
      {/* Hero banner */}
      <div
        className="relative h-[320px] sm:h-[380px]"
        style={{
          background: t.bannerUrl
            ? `url(${t.bannerUrl}) center/cover`
            : `radial-gradient(ellipse 90% 130% at 15% 0%, ${t.game?.accentColor ?? '#00f0ff'}33, transparent 60%), radial-gradient(ellipse 70% 100% at 85% 30%, #8b5cf62e, transparent 55%), #0d1022`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-void-950 via-void-950/60 to-void-950/20" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 sm:px-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge status={t.status} />
            <FormatBadge format={t.format} />
            <span className="badge bg-white/[0.06] text-slate-300 border-white/10">
              {t.type === 'team' ? 'Team Event' : t.type === 'duo' ? 'Duo Event' : 'Solo Event'}
            </span>
            {t.featured && (
              <span className="badge bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30">★ Featured</span>
            )}
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight text-white sm:text-5xl">
            {t.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="h-4 w-4 text-neon-cyan" /> {t.game?.name}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-neon-cyan" /> {formatDateTime(t.startsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-neon-cyan" /> {t.online ? 'Online' : t.venue || 'TBA'} ·{' '}
              {t.region}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-neon-cyan" /> {t.participantsCount}/{t.maxParticipants}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main column */}
          <div>
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'bracket', label: 'Bracket' },
                { id: 'participants', label: 'Players', count: data?.participants?.length },
                { id: 'rules', label: 'Rules' },
                { id: 'announcements', label: 'News', count: announcements.length || undefined },
              ]}
              active={tab}
              onChange={setTab}
            />

            <div className="mt-6">
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="glass p-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                      <Info className="h-5 w-5 text-neon-cyan" /> About this tournament
                    </h2>
                    <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-400">
                      {t.description || 'No description provided yet.'}
                    </p>
                  </div>

                  {t.prizes?.length > 0 && (
                    <div className="glass p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                        <Trophy className="h-5 w-5 text-amber-300" /> Prize Distribution
                      </h2>
                      <div className="mt-4 space-y-3">
                        {t.prizes.map((p: any) => (
                          <PrizeRow key={p.position} position={p.position} amount={p.amount} label={p.label} />
                        ))}
                      </div>
                    </div>
                  )}

                  {data?.matches?.length > 0 && (
                    <div className="glass p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                        <Clock className="h-5 w-5 text-neon-cyan" /> Match Schedule
                      </h2>
                      <div className="mt-4 space-y-2">
                        {data.matches
                          .filter((m: any) => m.status !== 'pending')
                          .slice(0, 8)
                          .map((m: any) => (
                            <div
                              key={m._id}
                              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm"
                            >
                              <div>
                                <p className="font-medium text-white">
                                  {m.participant1?.name}{' '}
                                  <span className="mx-1.5 text-slate-600">vs</span>{' '}
                                  {m.participant2?.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {m.roundName || `Round ${m.round}`} · {m.format.toUpperCase()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-400">
                                  {m.scheduledAt ? formatDateTime(m.scheduledAt) : 'TBA'}
                                </p>
                                <StatusBadge status={m.status} className="mt-1" />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'bracket' && (
                data?.bracket ? (
                  <BracketViewComponent bracket={data.bracket} liveMode={t.status === 'ongoing'} />
                ) : (
                  <EmptyState
                    icon={<Swords className="h-8 w-8" />}
                    title="Bracket not generated yet"
                    body={
                      canManage
                        ? 'Generate the bracket when registrations are ready.'
                        : 'The organizer will generate the bracket once registration closes.'
                    }
                    action={
                      canManage ? (
                        <Button
                          onClick={async () => {
                            try {
                              await api(`/api/tournaments/${t._id}/generate-bracket`, { body: {} });
                              toast.success('Bracket generated!');
                              refetch();
                              setTab('bracket');
                            } catch (err) {
                              toast.error('Failed', err instanceof Error ? err.message : undefined);
                            }
                          }}
                        >
                          Generate Bracket
                        </Button>
                      ) : undefined
                    }
                  />
                )
              )}

              {tab === 'participants' && (
                <div className="glass overflow-hidden">
                  {(data?.participants?.length ?? 0) === 0 ? (
                    <EmptyState title="No participants yet" body="Be the first to register!" />
                  ) : (
                    <div className="divide-y divide-white/[0.05]">
                      {data?.participants?.map((p: any, i: number) => (
                        <div key={p._id} className="flex items-center gap-4 px-5 py-4">
                          <span className="w-8 text-center font-display text-sm text-slate-600">
                            #{p.seed || i + 1}
                          </span>
                          <Avatar
                            name={p.team?.name ?? p.user?.name ?? 'Player'}
                            src={p.type === 'team' ? p.team?.logo : p.user?.avatar}
                            size="sm"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">
                              {p.team?.name ?? p.user?.name ?? 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {p.user?.playerId} · {p.inGameName || 'No IGN'}
                            </p>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'rules' && (
                <div className="glass p-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <ScrollText className="h-5 w-5 text-neon-purple" /> Rules & Regulations
                  </h2>
                  <div className="mt-4 whitespace-pre-line leading-relaxed text-slate-400">
                    {t.rules || 'Standard platform rules apply.'}
                  </div>
                  <div className="mt-6 rounded-xl border border-neon-cyan/15 bg-neon-cyan/[0.04] p-4 text-sm text-slate-400">
                    <strong className="text-neon-cyan">Format note:</strong> This tournament uses{' '}
                    {t.format.replace(/_/g, ' ')} with{' '}
                    {t.settings?.bestOfDefault ? `Best-of-${t.settings.bestOfDefault}` : 'Best-of-3'}{' '}
                    matches.
                  </div>
                </div>
              )}

              {tab === 'announcements' && (
                <div className="space-y-4">
                  {announcements.length === 0 ? (
                    <EmptyState title="No announcements" body="Organizer updates will appear here." />
                  ) : (
                    announcements.map((a: any) => (
                      <div key={a._id} className="glass p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-white">{a.title}</h3>
                          <span className="text-xs text-slate-500">{timeAgo(a.createdAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm text-slate-400">{a.body}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="glass-strong sticky top-24 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <Trophy className="h-3 w-3" /> Prize Pool
                  </p>
                  <p className="mt-1.5 font-display text-xl font-bold text-neon-cyan">
                    {formatCurrency(t.prizePool)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <IndianRupee className="h-3 w-3" /> Entry Fee
                  </p>
                  <p className="mt-1.5 font-display text-xl font-bold text-white">
                    {t.entryFee === 0 ? (
                      <span className="text-emerald-400">FREE</span>
                    ) : (
                      formatCurrency(t.entryFee)
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Slots filled</span>
                  <span className="font-semibold text-white">
                    {t.participantsCount}/{t.maxParticipants}
                  </span>
                </div>
                <ProgressBar value={t.participantsCount} max={t.maxParticipants} tone={slotsLeft < 10 ? 'pink' : 'cyan'} />
                <p className="mt-2 text-xs text-slate-500">
                  {slotsLeft > 0 ? `${slotsLeft} slots remaining` : 'Tournament is full'}
                </p>
              </div>

              {/* CTA area */}
              <div className="mt-6 space-y-2.5">
                {!user ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/login?next=/tournaments/${t.slug}`)}
                    >
                      SIGN IN TO REGISTER
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => router.push(`/register?next=/tournaments/${t.slug}`)}
                    >
                      Create an account
                    </Button>
                  </>
                ) : reg && reg.status !== 'cancelled' ? (
                  <>
                    <div
                      className={cn(
                        'rounded-xl border p-4 text-center',
                        reg.status === 'confirmed'
                          ? 'border-emerald-500/25 bg-emerald-500/10'
                          : 'border-amber-500/25 bg-amber-500/10',
                      )}
                    >
                      <p className="text-sm font-semibold text-white">
                        {reg.status === 'confirmed' ? '✅ You are registered!' : '⏳ Payment pending'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Registration ID: <span className="font-mono text-neon-cyan">{reg.registrationId}</span>
                      </p>
                    </div>
                    {reg.status === 'confirmed' && (
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => router.push(`/tournaments/${t.slug}/bracket`)}
                      >
                        <Swords className="h-4 w-4" /> VIEW BRACKET
                      </Button>
                    )}
                    {reg.status === 'pending' && (
                      <Button
                        className="w-full"
                        onClick={() => router.push(`/tournaments/${t.slug}/register`)}
                      >
                        COMPLETE PAYMENT
                      </Button>
                    )}
                    {t.settings?.allowCancel !== false && t.status === 'registration' && (
                      <Button variant="ghost" className="w-full" onClick={() => setCancelOpen(true)}>
                        Cancel registration
                      </Button>
                    )}
                  </>
                ) : registrationOpen && slotsLeft > 0 ? (
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/tournaments/${t.slug}/register`)}
                  >
                    <Swords className="h-4 w-4" /> REGISTER NOW
                  </Button>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-center text-sm text-slate-400">
                    {t.status === 'completed'
                      ? 'This tournament has concluded.'
                      : t.status === 'cancelled'
                        ? 'This tournament was cancelled.'
                        : 'Registration is currently closed.'}
                  </div>
                )}

                {canManage && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={async () => {
                        try {
                          await api(`/api/tournaments/${t._id}/start`, { body: {} });
                          toast.success('Tournament started!', 'Bracket generated and players notified.');
                          refetch();
                        } catch (err) {
                          toast.error('Could not start', err instanceof Error ? err.message : undefined);
                        }
                      }}
                      disabled={t.status === 'completed' || t.status === 'cancelled'}
                    >
                      <Radio className="h-4 w-4" /> Start
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => router.push(`/tournaments/${t.slug}/bracket`)}
                    >
                      Manage
                    </Button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(window.location.href)
                    .then(() => toast.success('Link copied!'))
                    .catch(() => toast.info('Copy this URL from the address bar'));
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 text-xs text-slate-500 transition hover:text-neon-cyan"
              >
                <Share2 className="h-3.5 w-3.5" /> Share tournament
              </button>
            </div>

            {/* Organizer card */}
            <div className="glass p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Organized by
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={t.organizer?.name ?? 'Organizer'} src={t.organizer?.avatar} size="md" />
                <div>
                  <p className="text-sm font-medium text-white">{t.organizer?.name}</p>
                  <div className="mt-1">
                    <RoleBadge role={t.organizer?.organizerProfile?.verified ? 'organizer' : 'player'} />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs text-slate-400">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                Matches moderated by NEXUS ARENA staff
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancelRegistration}
        title="Cancel registration?"
        message="Your slot will be released. If you paid an entry fee, refunds follow the platform refund policy."
        confirmLabel="Cancel registration"
        danger
        loading={cancelLoading}
      />
    </div>
  );
}
