'use client';

import { useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch } from '@/hooks/useData';
import { Avatar, Pagination, RoleBadge } from '@/components/ui/misc';
import { Input } from '@/components/ui/input';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { formatDateTime, cn } from '@/lib/utils';

export default function AdminLogsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  qs.set('page', String(page));
  qs.set('limit', '30');

  const { data, loading } = useFetch<any>(`/api/admin/logs?${qs.toString()}`);

  return (
    <AppShell section="admin" title="Audit Logs" subtitle="Every sensitive action, recorded.">
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by action (e.g. user:update)…"
          className="pl-10"
        />
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : (data?.items ?? []).length === 0 ? (
          <EmptyState icon={<ScrollText className="h-8 w-8" />} title="No audit entries" />
        ) : (
          (data?.items ?? []).map((log: any) => (
            <div key={log._id} className="glass flex flex-wrap items-center gap-4 p-4">
              <Avatar name={log.actor?.name ?? 'System'} size="sm" />
              <div className="min-w-[180px] flex-1">
                <p className="text-sm text-white">
                  <span className="font-medium">{log.actor?.name ?? 'System'}</span>
                  <span className="mx-2 text-slate-600">→</span>
                  <span className="font-mono text-xs text-neon-cyan">{log.action}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {log.targetType} {log.targetId && `· ${String(log.targetId).slice(0, 12)}…`}
                </p>
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <pre className="max-w-[280px] overflow-hidden text-ellipsis whitespace-pre-wrap rounded-lg bg-white/[0.03] p-2 text-[10px] text-slate-500">
                  {JSON.stringify(log.details).slice(0, 160)}
                </pre>
              )}
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</p>
                <p className="text-[10px] text-slate-600">{log.ip || '—'}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <Pagination page={page} pages={Math.ceil((data?.total ?? 0) / 30)} onChange={setPage} />
      </div>
    </AppShell>
  );
}
