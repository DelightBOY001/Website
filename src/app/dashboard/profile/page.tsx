'use client';

import { useEffect, useState } from 'react';
import { User, Save, Award, Target, TrendingUp, Swords } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Avatar, RoleBadge } from '@/components/ui/misc';
import { StatCard } from '@/components/ui/card';
import { Skeleton, PageLoader } from '@/components/ui/states';
import { DonutChart } from '@/components/charts';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const { data, loading } = useFetch<any>('/api/me/profile');
  const [form, setForm] = useState({ name: '', bio: '', avatar: '', region: 'IN', country: 'India' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.user) {
      setForm({
        name: data.user.name ?? '',
        bio: data.user.bio ?? '',
        avatar: data.user.avatar ?? '',
        region: data.user.region ?? 'IN',
        country: data.user.country ?? 'India',
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api('/api/me/profile', { method: 'PATCH', body: form });
      await refresh();
      toast.success('Profile updated!');
    } catch (err) {
      toast.error('Could not save', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const u = data?.user;
  const s = u?.stats ?? {};
  const played = (s.wins ?? 0) + (s.losses ?? 0);

  return (
    <AppShell title="Profile" subtitle="Your public competitive identity.">
      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile card */}
          <div className="glass p-6 text-center">
            <div className="flex justify-center">
              <Avatar name={form.name} src={form.avatar} size="lg" className="!h-24 !w-24 !text-2xl" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">{form.name}</h2>
            <p className="mt-1 text-sm text-slate-500">@{u?.username}</p>
            <div className="mt-2 flex justify-center">
              <RoleBadge role={u?.role ?? 'player'} />
            </div>
            <div className="mt-4 rounded-xl border border-neon-cyan/15 bg-neon-cyan/[0.04] p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Player ID</p>
              <p className="mt-1 font-mono text-lg font-bold text-neon-cyan">{u?.playerId}</p>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Member since {formatDate(u?.createdAt)}
            </p>
          </div>

          {/* Edit form */}
          <div className="glass p-6 lg:col-span-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <User className="h-5 w-5 text-neon-cyan" /> Edit Profile
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Display name" htmlFor="pname">
                <Input
                  id="pname"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={80}
                />
              </Field>
              <Field label="Avatar URL" htmlFor="pavatar">
                <Input
                  id="pavatar"
                  value={form.avatar}
                  onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Region" htmlFor="pregion">
                <Input
                  id="pregion"
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  maxLength={32}
                />
              </Field>
              <Field label="Country" htmlFor="pcountry">
                <Input
                  id="pcountry"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  maxLength={64}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Bio" htmlFor="pbio" hint={`${form.bio.length}/500`}>
                <Textarea
                  id="pbio"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, 500) }))}
                  placeholder="Tell the arena about yourself…"
                  rows={4}
                />
              </Field>
            </div>
            <Button onClick={save} loading={saving} className="mt-5">
              <Save className="h-4 w-4" /> SAVE CHANGES
            </Button>
          </div>

          {/* Stats */}
          <div className="glass p-6 lg:col-span-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Target className="h-5 w-5 text-neon-purple" /> Career Statistics
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              <StatCard label="Matches" value={played} icon={<Swords className="h-4 w-4" />} />
              <StatCard label="Wins" value={s.wins ?? 0} tone="lime" icon={<TrendingUp className="h-4 w-4" />} />
              <StatCard label="Losses" value={s.losses ?? 0} tone="pink" />
              <StatCard label="Win Rate" value={played ? `${Math.round(((s.wins ?? 0) / played) * 100)}%` : '—'} tone="purple" />
              <StatCard label="Earnings" value={formatCurrency(s.earnings ?? 0)} />
              <StatCard label="Tournaments" value={s.tournamentsPlayed ?? 0} tone="lime" />
            </div>
            <div className="mt-8">
              <DonutChart
                segments={[
                  { label: 'Wins', value: s.wins ?? 0, color: '#22c55e' },
                  { label: 'Losses', value: s.losses ?? 0, color: '#f43f5e' },
                  { label: 'Draws', value: s.draws ?? 0, color: '#64748b' },
                ]}
                centerValue={String(played)}
                centerLabel="total matches"
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
