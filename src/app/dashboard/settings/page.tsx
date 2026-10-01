'use client';

import { useEffect, useState } from 'react';
import { Bell, Mail, Shield, LogOut, Save, Smartphone } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/ui/misc';
import { Card, CardBody, CardHeader } from '@/components/ui/card';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 text-neon-cyan/70">{icon}</div>}
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-gradient-to-r from-neon-cyan to-neon-blue' : 'bg-white/10'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const { data, refetch } = useFetch<any>('/api/me/profile');
  const [prefs, setPrefs] = useState({
    email: true,
    matchAlerts: true,
    tournamentAlerts: true,
    marketing: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.user?.notificationPrefs) {
      setPrefs((p) => ({ ...p, ...data.user.notificationPrefs }));
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api('/api/me/profile', { method: 'PATCH', body: { notificationPrefs: prefs } });
      toast.success('Settings saved!');
    } catch (err) {
      toast.error('Could not save', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Settings" subtitle="Notifications, security and preferences.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Notification Preferences" subtitle="Choose what reaches you" />
          <CardBody className="divide-y divide-white/[0.05]">
            <ToggleRow
              icon={<Mail className="h-4 w-4" />}
              label="Email notifications"
              description="Payment confirmations, receipts and important updates"
              checked={prefs.email}
              onChange={(v) => setPrefs((p) => ({ ...p, email: v }))}
            />
            <ToggleRow
              icon={<Bell className="h-4 w-4" />}
              label="Match alerts"
              description="Match assignments, reminders and results"
              checked={prefs.matchAlerts}
              onChange={(v) => setPrefs((p) => ({ ...p, matchAlerts: v }))}
            />
            <ToggleRow
              icon={<Smartphone className="h-4 w-4" />}
              label="Tournament updates"
              description="Bracket generated, tournament starting, announcements"
              checked={prefs.tournamentAlerts}
              onChange={(v) => setPrefs((p) => ({ ...p, tournamentAlerts: v }))}
            />
            <ToggleRow
              icon={<Mail className="h-4 w-4" />}
              label="Product & marketing"
              description="New features, promotions and seasonal events"
              checked={prefs.marketing}
              onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
            />
            <Button onClick={save} loading={saving} className="mt-5">
              <Save className="h-4 w-4" /> SAVE PREFERENCES
            </Button>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Account" subtitle="Your account details" />
            <CardBody>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                  <span className="text-slate-500">Email</span>
                  <span className="text-white">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                  <span className="text-slate-500">Player ID</span>
                  <span className="font-mono text-neon-cyan">{user?.playerId}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                  <span className="text-slate-500">Role</span>
                  <RoleBadge role={user?.role ?? 'player'} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                  <span className="text-slate-500">Email verified</span>
                  <span className={user?.emailVerified ? 'text-emerald-400' : 'text-amber-400'}>
                    {user?.emailVerified ? 'Verified' : 'Not verified'}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Security" subtitle="Protect your account" />
            <CardBody className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <Shield className="mt-0.5 h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">Signed-in session</p>
                  <p className="text-xs text-slate-500">
                    Sessions expire automatically after 7 days of inactivity and are HTTP-only
                    secured.
                  </p>
                </div>
              </div>
              <Button variant="danger" className="w-full" onClick={logout}>
                <LogOut className="h-4 w-4" /> SIGN OUT OF ALL DEVICES
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
