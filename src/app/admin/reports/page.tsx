'use client';

import { useState } from 'react';
import { FileBarChart, Download, Users, Trophy, CreditCard, Activity } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch } from '@/hooks/useData';
import { Tabs } from '@/components/ui/misc';
import { StatCard, Card, CardBody, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/states';
import { BarChart, LineChart, DonutChart } from '@/components/charts';
import { formatCurrency } from '@/lib/utils';

export default function AdminReportsPage() {
  const [range, setRange] = useState('7d');
  const { data, loading } = useFetch<any>(`/api/admin/reports?range=${range}`);
  const d = data ?? {};

  return (
    <AppShell section="admin" title="Reports & Analytics" subtitle="Revenue, registrations and platform growth.">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: '7d', label: 'Last 7 days' },
            { id: '30d', label: 'Last 30 days' },
            { id: '90d', label: 'Last 90 days' },
          ]}
          active={range}
          onChange={setRange}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue Trend" subtitle={`Last ${range.replace('d', '')} days · ₹`} />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <LineChart
                data={(d.revenueByDay ?? []).map((r: any) => ({ label: r.date?.slice(5), value: r.amount }))}
                height={200}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Registrations" subtitle="New sign-ups per day" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <BarChart
                data={(d.regsByDay ?? []).map((r: any) => ({ label: r.date?.slice(5), value: r.count }))}
                height={200}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tournaments by Format" subtitle="Distribution across formats" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <DonutChart
                segments={(d.tournamentsByFormat ?? []).map((f: any, i: number) => ({
                  label: String(f._id ?? 'unknown').replace(/_/g, ' '),
                  value: f.count,
                  color: ['#00f0ff', '#8b5cf6', '#f43f5e', '#22c55e', '#fbbf24', '#3b82f6'][i % 6],
                }))}
                centerValue={String((d.tournamentsByFormat ?? []).reduce((a: number, f: any) => a + f.count, 0))}
                centerLabel="tournaments"
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Payment Status Split" subtitle="All recorded transactions" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <DonutChart
                segments={(d.paymentsByStatus ?? []).map((f: any, i: number) => ({
                  label: String(f._id ?? 'unknown'),
                  value: f.count,
                  color: ['#22c55e', '#f43f5e', '#fbbf24', '#8b5cf6', '#64748b'][i % 5],
                }))}
                centerValue={String((d.paymentsByStatus ?? []).reduce((a: number, f: any) => a + f.count, 0))}
                centerLabel="payments"
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Users by Role" subtitle="Platform role distribution" />
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {(d.usersByRole ?? []).map((r: any) => (
              <div key={r._id} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center">
                <Users className="mx-auto h-4 w-4 text-neon-cyan/70" />
                <p className="mt-2 font-display text-2xl font-bold text-white">{r.count}</p>
                <p className="text-xs text-slate-500">{String(r._id).replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </AppShell>
  );
}
