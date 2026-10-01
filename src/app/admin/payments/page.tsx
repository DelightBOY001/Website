'use client';

import { useState } from 'react';
import { CreditCard, Search, RotateCcw, Download } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useToast } from '@/components/ui/toast';
import { StatusBadge, Pagination } from '@/components/ui/misc';
import { StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/dialog';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function AdminPaymentsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('Refund by admin');
  const [busy, setBusy] = useState(false);

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (status) qs.set('status', status);
  qs.set('page', String(page));
  qs.set('limit', '25');

  const { data, loading, refetch } = useFetch<any>(`/api/admin/payments?${qs.toString()}`);

  const items = data?.items ?? [];
  const totalCaptured = items
    .filter((p: any) => p.status === 'captured')
    .reduce((a: number, p: any) => a + p.amount / 100, 0);

  const doRefund = async () => {
    if (!refundTarget) return;
    setBusy(true);
    try {
      await api(`/api/payments/${refundTarget._id}/refund`, {
        body: { reason: refundReason },
      });
      toast.success('Refund initiated', 'The amount will reflect in 5-7 business days.');
      setRefundTarget(null);
      refetch();
    } catch (err) {
      toast.error('Refund failed', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell section="admin" title="Payment Management" subtitle="Transactions, refunds and revenue.">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Page Total (Captured)" value={formatCurrency(totalCaptured)} icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="Transactions" value={items.length} tone="purple" />
        <StatCard
          label="Failed"
          value={items.filter((p: any) => p.status === 'failed').length}
          tone="pink"
        />
        <StatCard
          label="Refunded"
          value={items.filter((p: any) => p.status.startsWith('refunded') || p.status === 'partially_refunded').length}
          tone="lime"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search invoice / order / payment ID…"
            className="pl-10"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-44"
        >
          <option value="">All statuses</option>
          <option value="created">Created</option>
          <option value="captured">Captured</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </Select>
      </div>

      <div className="glass mt-6 overflow-x-auto">
        <table className="table-base min-w-[960px]">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>User</th>
              <th>Tournament</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState icon={<CreditCard className="h-8 w-8" />} title="No payments" />
                </td>
              </tr>
            ) : (
              items.map((p: any) => (
                <tr key={p._id}>
                  <td className="font-mono text-xs text-slate-400">{p.invoiceNumber}</td>
                  <td>
                    <p className="text-white">{p.user?.name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{p.user?.email}</p>
                  </td>
                  <td className="text-slate-300">{p.tournament?.title ?? '—'}</td>
                  <td className="font-semibold text-white">{formatCurrency(p.amount / 100)}</td>
                  <td className="text-xs text-slate-400">{(p.method || '—').toUpperCase()}</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="text-xs text-slate-500">{formatDateTime(p.createdAt)}</td>
                  <td>
                    {p.status === 'captured' && (
                      <Button size="sm" variant="ghost" onClick={() => setRefundTarget(p)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Refund
                      </Button>
                    )}
                    {p.status === 'failed' && p.failureReason && (
                      <span className="max-w-[140px] truncate text-xs text-rose-400" title={p.failureReason}>
                        {p.failureReason}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Pagination page={page} pages={Math.ceil((data?.total ?? 0) / 25)} onChange={setPage} />
        <Button variant="secondary" size="sm" onClick={() => toast.info('Export', 'CSV export is generated in the reports section.')}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <Modal open={Boolean(refundTarget)} onClose={() => setRefundTarget(null)} title="Process refund">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm">
            <p className="text-slate-400">
              Refunding <strong className="text-white">{refundTarget?.user?.name}</strong> for{' '}
              <strong className="text-white">{refundTarget?.tournament?.title}</strong>
            </p>
            <p className="mt-2 font-display text-xl font-bold text-neon-cyan">
              {formatCurrency((refundTarget?.amount ?? 0) / 100)}
            </p>
          </div>
          <Input
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="Refund reason"
          />
          <Button variant="danger" onClick={doRefund} loading={busy} className="w-full">
            CONFIRM REFUND
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
