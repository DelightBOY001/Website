'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Trophy,
  CreditCard,
  Swords,
  Megaphone,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useRealtime } from '@/hooks/useRealtime';
import { Button } from '@/components/ui/button';
import { Tabs, StatusBadge } from '@/components/ui/misc';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { timeAgo, cn } from '@/lib/utils';

const ICONS: Record<string, any> = {
  registration_confirmed: Trophy,
  registration_cancelled: ShieldAlert,
  payment_success: CreditCard,
  payment_failed: CreditCard,
  payment_refunded: CreditCard,
  match_assigned: Swords,
  match_reminder: Swords,
  match_result: Swords,
  tournament_starting: Trophy,
  tournament_victory: Trophy,
  bracket_generated: Swords,
  announcement: Megaphone,
  team_invite: Bell,
  admin_action: ShieldAlert,
};

export default function NotificationsPage() {
  const [tab, setTab] = useState('all');
  const { data, loading, refetch } = useFetch<any>(
    `/api/notifications?${tab === 'unread' ? 'unread=true' : ''}&limit=60`,
    [tab],
  );
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    setItems(data?.items ?? []);
  }, [data]);

  useRealtime(
    ['global', 'notifications'],
    useCallback(
      (e: { type: string; payload?: unknown }) => {
        if (e.type === 'notification:new') refetch();
      },
      [refetch],
    ),
  );

  const markAllRead = async () => {
    await api('/api/notifications', { body: { ids: 'all' } });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    refetch();
  };

  return (
    <AppShell
      title="Notifications"
      subtitle="Match alerts, payments and platform updates."
      actions={
        <Button variant="secondary" onClick={markAllRead}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      }
    >
      <Tabs
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'unread', label: 'Unread', count: data?.unread },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6 space-y-3">
        {loading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-8 w-8" />}
            title="All caught up!"
            body="You have no notifications right now."
          />
        ) : (
          items.map((n: any) => {
            const Icon = ICONS[n.type] ?? Sparkles;
            return (
              <div
                key={n._id}
                className={cn(
                  'glass flex items-start gap-4 p-5 transition',
                  !n.read && 'border-neon-cyan/20 bg-neon-cyan/[0.03]',
                )}
              >
                <div
                  className={cn(
                    'rounded-xl p-2.5',
                    n.type.includes('payment')
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : n.type.includes('match')
                        ? 'bg-violet-500/10 text-violet-400'
                        : n.type.includes('victory')
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-neon-cyan/10 text-neon-cyan',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <p className={cn('text-sm', n.read ? 'text-slate-300' : 'font-semibold text-white')}>
                      {n.title}
                    </p>
                    <span className="shrink-0 text-xs text-slate-500">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{n.body}</p>
                  {n.link && (
                    <Link href={n.link} className="mt-2 inline-block text-xs text-neon-cyan hover:underline">
                      View details →
                    </Link>
                  )}
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-neon-cyan" />}
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
