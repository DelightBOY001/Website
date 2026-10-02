'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Users, Plus, Search, Trophy } from 'lucide-react';
import { useFetch, api } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { Field } from '@/components/ui/input';
import { SkeletonCards, EmptyState } from '@/components/ui/states';
import { Avatar } from '@/components/ui/misc';
import { formatCurrency } from '@/lib/utils';

export default function TeamsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', tag: '', description: '' });
  const [busy, setBusy] = useState(false);

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  qs.set('limit', '24');

  const { data, loading, refetch } = useFetch<{ items: any[] }>(`/api/teams?${qs.toString()}`);

  const createTeam = async () => {
    setBusy(true);
    try {
      await api('/api/teams', { body: form });
      toast.success('Team created!', 'Invite your squad and register for team tournaments.');
      setCreateOpen(false);
      setForm({ name: '', tag: '', description: '' });
      refetch();
    } catch (err) {
      toast.error('Could not create team', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-cyan">
            Stronger together
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">Teams</h1>
          <p className="mt-2 max-w-lg text-sm text-slate-400">
            Discover squads, check their track record, or build your own dream roster.
          </p>
        </div>
        <div className="flex w-full max-w-md items-center gap-2 sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams…"
              className="pl-10"
            />
          </div>
          {user && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create
            </Button>
          )}
        </div>
      </div>

      <div className="mt-10">
        {loading ? (
          <SkeletonCards count={6} />
        ) : (data?.items?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No teams found"
            body="Be the first to create a team and start recruiting."
            action={
              user ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Create Team
                </Button>
              ) : (
                <Link href="/login" className="btn-primary">
                  Sign in to create a team
                </Link>
              )
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items?.map((team: any) => (
              <Link key={team._id} href={`/teams/${team.slug || team._id}`} className="glass glass-hover p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${team.color ?? '#9b8cf3'}44, ${team.color ?? '#9b8cf3'}11)`,
                      border: `1px solid ${team.color ?? '#9b8cf3'}55`,
                    }}
                  >
                    {(team.tag || team.name).slice(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{team.name}</h3>
                    <p className="text-xs text-slate-500">
                      {team.members?.filter((m: any) => m.status === 'active').length ?? 0} members ·{' '}
                      {team.game?.name ?? 'Multi-game'}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white/[0.03] px-2 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Wins</p>
                    <p className="mt-1 font-semibold text-emerald-400">{team.stats?.wins ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] px-2 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Matches</p>
                    <p className="mt-1 font-semibold text-white">{team.stats?.matchesPlayed ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] px-2 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Earnings</p>
                    <p className="mt-1 font-semibold text-neon-cyan">
                      {formatCurrency(team.stats?.earnings ?? 0)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a team">
        <div className="space-y-4">
          <Field label="Team name" htmlFor="tname">
            <Input
              id="tname"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Phoenix Rising"
              maxLength={50}
            />
          </Field>
          <Field label="Team tag" htmlFor="ttag" hint="2-8 characters">
            <Input
              id="ttag"
              value={form.tag}
              onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value.toUpperCase() }))}
              placeholder="PHNX"
              maxLength={8}
            />
          </Field>
          <Field label="Description" htmlFor="tdesc">
            <Input
              id="tdesc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What makes your team special?"
              maxLength={1000}
            />
          </Field>
          <Button onClick={createTeam} loading={busy} className="w-full" disabled={form.name.length < 3}>
            <Trophy className="h-4 w-4" /> CREATE TEAM
          </Button>
        </div>
      </Modal>
    </div>
  );
}
