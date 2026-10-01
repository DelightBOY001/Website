'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, CreditCard, Bot, Bell, Globe } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/states';

export default function AdminSettingsPage() {
  const toast = useToast();
  const { data, loading, refetch } = useFetch<any>('/api/admin/settings');
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api('/api/admin/settings', {
        method: 'PATCH',
        body: {
          siteName: form.siteName,
          tagline: form.tagline,
          maintenanceMode: Boolean(form.maintenanceMode),
          allowRegistration: Boolean(form.allowRegistration),
          paymentsEnabled: Boolean(form.paymentsEnabled),
          aiEnabled: Boolean(form.aiEnabled),
          notificationEmailEnabled: Boolean(form.notificationEmailEnabled),
          supportEmail: form.supportEmail,
          platformFeePercent: Number(form.platformFeePercent ?? 5),
          taxPercent: Number(form.taxPercent ?? 18),
        },
      });
      toast.success('Settings saved');
      refetch();
    } catch (err) {
      toast.error('Could not save', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <AppShell section="admin" title="Platform Settings" subtitle="Global configuration for NEXUS ARENA.">
      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="General" subtitle="Site identity and access" />
            <CardBody className="space-y-4">
              <Field label="Site name">
                <Input value={form.siteName ?? ''} onChange={(e) => set('siteName', e.target.value)} />
              </Field>
              <Field label="Tagline">
                <Input value={form.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} />
              </Field>
              <Field label="Support email">
                <Input value={form.supportEmail ?? ''} onChange={(e) => set('supportEmail', e.target.value)} />
              </Field>
              <Toggle
                label="Allow new registrations"
                checked={form.allowRegistration !== false}
                onChange={(v) => set('allowRegistration', v)}
              />
              <Toggle
                label="Maintenance mode"
                checked={Boolean(form.maintenanceMode)}
                onChange={(v) => set('maintenanceMode', v)}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payments" subtitle="Fee structure" />
            <CardBody className="space-y-4">
              <Toggle
                label="Payments enabled"
                checked={form.paymentsEnabled !== false}
                onChange={(v) => set('paymentsEnabled', v)}
              />
              <Field label="Platform fee (%)">
                <Input
                  type="number"
                  value={form.platformFeePercent ?? 5}
                  onChange={(e) => set('platformFeePercent', e.target.value)}
                />
              </Field>
              <Field label="Tax / GST (%)">
                <Input
                  type="number"
                  value={form.taxPercent ?? 18}
                  onChange={(e) => set('taxPercent', e.target.value)}
                />
              </Field>
              <p className="text-xs text-slate-500">
                Gateway keys (RAZORPAY_KEY_ID / KEY_SECRET / WEBHOOK_SECRET) are configured via
                environment variables only — never through the dashboard.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="AI Configuration" subtitle="Assistant behaviour" />
            <CardBody className="space-y-4">
              <Toggle
                label="AI features enabled"
                checked={form.aiEnabled !== false}
                onChange={(v) => set('aiEnabled', v)}
              />
              <Field label="Daily AI limit per user">
                <Input
                  type="number"
                  value={form.aiDailyLimit ?? 100}
                  onChange={(e) => set('aiDailyLimit', e.target.value)}
                />
              </Field>
              <p className="text-xs text-slate-500">
                The AI model and API key (AI_API_KEY, AI_BASE_URL, AI_MODEL) are configured via
                environment variables. Without a key, assistants answer in data-mode using live
                platform queries.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notifications" subtitle="Email delivery" />
            <CardBody className="space-y-4">
              <Toggle
                label="Notification emails"
                checked={form.notificationEmailEnabled !== false}
                onChange={(v) => set('notificationEmailEnabled', v)}
              />
              <p className="text-xs text-slate-500">
                Transactional email uses EMAIL_API_KEY (Resend-compatible). Without a key, emails
                are logged to the server console for development.
              </p>
            </CardBody>
          </Card>

          <div className="lg:col-span-2">
            <Button onClick={save} loading={saving} className="w-full btn-lg">
              <Save className="h-4 w-4" /> SAVE ALL SETTINGS
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-gradient-to-r from-neon-cyan to-neon-blue' : 'bg-white/10'}`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}
