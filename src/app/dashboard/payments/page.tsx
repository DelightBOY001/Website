'use client';

import { useState } from 'react';
import { CreditCard, Download, IndianRupee, TrendingUp, Wallet } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch } from '@/hooks/useData';
import { StatusBadge, Tabs } from '@/components/ui/misc';
import { StatCard } from '@/components/ui/card';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { formatCurrency, formatDateTime, cn } from '@/lib/utils';

export default function PaymentsPage() {
  const [tab, setTab] = useState('all');
  const { data, loading } = useFetch<any>('/api/me/payments');
  const items = data?.items ?? [];

  const totalPaid = items
    .filter((p: any) => p.status === 'captured')
    .reduce((a: number, p: any) => a + p.amount / 100, 0);
  const refunded = items
    .filter((p: any) => p.status === 'refunded' || p.status === 'partially_refunded')
    .reduce((a: number, p: any) => a + (p.refund?.amount ?? 0) / 100, 0);

  const filtered = items.filter((p: any) => {
    if (tab === 'all') return true;
    return p.status === tab;
  });

  return (
    <AppShell title="Payments" subtitle="Your transaction history and invoices.">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Invested"
          value={formatCurrency(totalPaid)}
          icon={<Wallet className="h-4 w-4" />}
          tone="cyan"
        />
        <StatCard
          label="Transactions"
          value={items.length}
          icon={<CreditCard className="h-4 w-4" />}
          tone="purple"
        />
        <StatCard
          label="Refunded"
          value={formatCurrency(refunded)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="lime"
        />
        <StatCard
          label="Failed"
          value={items.filter((p: any) => p.status === 'failed').length}
          icon={<IndianRupee className="h-4 w-4" />}
          tone="pink"
        />
      </div>

      <div className="mt-8">
        <Tabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'captured', label: 'Successful' },
            { id: 'failed', label: 'Failed' },
            { id: 'refunded', label: 'Refunded' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="glass mt-6 overflow-x-auto">
        <table className="table-base min-w-[780px]">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Tournament</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
              <th>Txn ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={<CreditCard className="h-8 w-8" />}
                    title="No transactions"
                    body="Your entry fee payments will appear here."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((p: any) => (
                <tr key={p._id}>
                  <td className="font-mono text-xs text-slate-400">{p.invoiceNumber}</td>
                  <td className="text-white">{p.tournament?.title ?? '—'}</td>
                  <td className="font-semibold text-white">{formatCurrency(p.amount / 100)}</td>
                  <td className="text-slate-400">
                    {(p.method || '—').toUpperCase().replace(/_/g, ' ')}
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="text-xs text-slate-500">{formatDateTime(p.createdAt)}</td>
                  <td className="font-mono text-xs text-slate-500">
                    {(p.razorpayPaymentId ?? '—').slice(0, 16)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
