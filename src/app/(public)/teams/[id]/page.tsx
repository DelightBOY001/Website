'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Users, Trophy, Swords, ArrowLeft, Copy, UserPlus } from 'lucide-react';
import { useFetch, api } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { PageLoader, ErrorState } from '@/components/ui/states';
import { Avatar, StatusBadge } from '@/components/ui/misc';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch<any>(id ? `/api/teams/${id}` : null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader label="Loading team…" />;
  if (error || !data?.team)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState onRetry={refetch} body={error ?? 'Team not found.'} />
      </div>
    );

  const team = data.team;
  const activeMembers = (team.members ?? []).filter((m: any) => m.status === 'active');

  const joinTeam = async () => {
    setBusy(true);
    try {
      await api(`/api/teams/${team._id}/join`, { body: { inviteCode: joinCode || team.inviteCode } });
      toast.success('Joined team!', `Welcome to ${team.name}.`);
      refetch();
    } catch (err) {
      toast.error('Could not join', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const leaveTeam = async () => {
    setBusy(true);
    try {
      await api(`/api/teams/${team._id}/leave`, {});
      toast.success('Left team');
      refetch();
    } catch (err) {
      toast.error('Could not leave', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/teams"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-neon-cyan"
      >
        <ArrowLeft className="h-4 w-4" /> All teams
      </Link>

      <div className="glass-strong overflow-hidden">
        <div
          className="h-36"
          style={{
            background: `radial-gradient(ellipse 100% 130% at 15% 0%, ${team.color ?? '#8b5cf6'}44, transparent 60%), #0d1022`,
          }}
        />
        <div className="px-8 pb-8">
          <div className="-mt-10 flex flex-wrap items-end gap-5">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white ring-4 ring-void-950"
              style={{
                background: `linear-gradient(135deg, ${team.color ?? '#8b5cf6'}55, ${team.color ?? '#8b5cf6'}22)`,
                border: `1px solid ${team.color ?? '#8b5cf6'}66`,
              }}
            >
              {(team.tag || team.name).slice(0, 3).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">{team.name}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {team.tag && <span className="mr-2 text-neon-cyan">[{team.tag}]</span>}
                {team.game?.name ?? 'Multi-game'} · Led by {team.captain?.name ?? 'Captain'}
              </p>
            </div>
            <div className="flex gap-2">
              {data.viewerRole === 'guest' && user && (
                <Button onClick={joinTeam} loading={busy}>
                  <UserPlus className="h-4 w-4" /> Join Team
                </Button>
              )}
              {data.viewerRole === 'member' && (
                <Button variant="secondary" onClick={leaveTeam} loading={busy}>
                  Leave team
                </Button>
              )}
            </div>
          </div>

          {team.description && (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-400">{team.description}</p>
          )}

          {data.inviteCode && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-neon-cyan/20 bg-neon-cyan/[0.05] px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Invite code (captain only)
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-neon-cyan">{data.inviteCode}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(data.inviteCode);
                  toast.success('Invite code copied!');
                }}
                className="btn-ghost btn-sm ml-auto"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
            </div>
          )}

          {data.viewerRole === 'guest' && !user && (
            <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-slate-400">
              Have an invite code?{' '}
              <Link href="/login" className="text-neon-cyan underline">
                Sign in
              </Link>{' '}
              to join this team.
            </div>
          )}

          {user && data.viewerRole === 'guest' && (
            <div className="mt-5 flex items-center gap-3">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ENTER INVITE CODE"
                className="input max-w-xs font-mono"
              />
              <Button variant="secondary" onClick={joinTeam} loading={busy}>
                Join with code
              </Button>
            </div>
          )}

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Matches', value: team.stats?.matchesPlayed ?? 0, icon: Swords },
              { label: 'Wins', value: team.stats?.wins ?? 0, icon: Trophy },
              { label: 'Tournaments', value: team.stats?.tournamentsPlayed ?? 0, icon: Users },
              { label: 'Earnings', value: formatCurrency(team.stats?.earnings ?? 0), icon: Trophy },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <s.icon className="h-4 w-4 text-neon-cyan/70" />
                <p className="mt-2 font-display text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Roster */}
          <h2 className="mt-10 text-lg font-semibold text-white">Roster</h2>
          <div className="mt-4 space-y-2">
            {activeMembers.map((m: any) => (
              <div
                key={m.user?._id ?? m.joinedAt}
                className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <Avatar name={m.user?.name ?? 'Player'} src={m.user?.avatar} size="sm" />
                <div className="flex-1">
                  <Link
                    href={`/players/${m.user?.username ?? m.user?._id}`}
                    className="text-sm font-medium text-white hover:text-neon-cyan"
                  >
                    {m.user?.name ?? 'Player'}
                  </Link>
                  <p className="text-xs text-slate-500">{m.user?.playerId}</p>
                </div>
                <span
                  className={
                    m.role === 'captain'
                      ? 'badge bg-amber-500/12 text-amber-300 border-amber-400/25'
                      : 'badge bg-white/[0.05] text-slate-400 border-white/10'
                  }
                >
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
