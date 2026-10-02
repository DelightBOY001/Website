'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Users, Plus, Copy, Crown, LogOut, Settings2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { Avatar } from '@/components/ui/misc';
import { formatCurrency } from '@/lib/utils';

export default function MyTeamsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, refetch } = useFetch<any>('/api/teams?mine=true');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', tag: '', description: '' });
  const [busy, setBusy] = useState(false);

  const createTeam = async () => {
    setBusy(true);
    try {
      await api('/api/teams', { body: form });
      toast.success('Team created!', 'Share the invite code with your squad.');
      setCreateOpen(false);
      refetch();
    } catch (err) {
      toast.error('Could not create', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const leaveTeam = async (teamId: string) => {
    try {
      await api(`/api/teams/${teamId}/leave`, {});
      toast.success('Left team');
      refetch();
    } catch (err) {
      toast.error('Could not leave', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <AppShell
      title="My Teams"
      subtitle="Manage your squads and rosters."
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Team
        </Button>
      }
    >
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (data?.items ?? []).length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No teams yet"
          body="Create a team to participate in team tournaments and climb team rankings."
          action={
            <Button onClick={() => setCreateOpen(true)} className="mt-1">
              <Plus className="h-4 w-4" /> Create Your Team
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {(data?.items ?? []).map((team: any) => {
            const isCaptain = String(team.captain?._id ?? team.captain) === user?.id;
            return (
              <div key={team._id} className="glass p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${team.color ?? '#9b8cf3'}44, transparent)`,
                        border: `1px solid ${team.color ?? '#9b8cf3'}55`,
                      }}
                    >
                      {(team.tag || team.name).slice(0, 3)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{team.name}</h3>
                      <p className="text-xs text-slate-500">
                        {team.members?.filter((m: any) => m.status === 'active').length ?? 0}/
                        {team.maxSize} members
                      </p>
                    </div>
                  </div>
                  {isCaptain ? (
                    <span className="badge bg-amber-500/12 text-amber-300 border-amber-400/25">
                      <Crown className="h-3 w-3" /> Captain
                    </span>
                  ) : (
                    <span className="badge bg-white/[0.05] text-slate-400 border-white/10">Member</span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white/[0.03] py-2.5">
                    <p className="text-lg font-bold text-emerald-400">{team.stats?.wins ?? 0}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Wins</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] py-2.5">
                    <p className="text-lg font-bold text-white">{team.stats?.matchesPlayed ?? 0}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Matches</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] py-2.5">
                    <p className="text-lg font-bold text-neon-cyan">
                      {formatCurrency(team.stats?.earnings ?? 0)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Earned</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <Link href={`/teams/${team.slug || team._id}`} className="btn-secondary btn-sm flex-1">
                    <Settings2 className="h-3.5 w-3.5" /> Manage
                  </Link>
                  {isCaptain ? (
                    <button
                      onClick={async () => {
                        const res = await api<any>(`/api/teams/${team._id}/invite`, {
                          body: { regenerate: true },
                        });
                        navigator.clipboard?.writeText(res?.inviteCode ?? '');
                        toast.success('Invite code copied!', res?.inviteCode);
                      }}
                      className="btn-ghost btn-sm"
                    >
                      <Copy className="h-3.5 w-3.5" /> Invite
                    </button>
                  ) : (
                    <button onClick={() => leaveTeam(team._id)} className="btn-ghost btn-sm text-rose-400">
                      <LogOut className="h-3.5 w-3.5" /> Leave
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a team">
        <div className="space-y-4">
          <Field label="Team name" htmlFor="tn">
            <Input
              id="tn"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Phoenix Rising"
              maxLength={50}
            />
          </Field>
          <Field label="Tag" htmlFor="tt">
            <Input
              id="tt"
              value={form.tag}
              onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value.toUpperCase() }))}
              placeholder="PHNX"
              maxLength={8}
            />
          </Field>
          <Field label="Description" htmlFor="td">
            <Input
              id="td"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Team motto or description"
            />
          </Field>
          <Button onClick={createTeam} loading={busy} className="w-full" disabled={form.name.length < 3}>
            CREATE TEAM
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
