'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Inbox, AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from './button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonCards({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-5 md:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass p-5">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="mt-4 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title = 'Nothing here yet',
  body,
  action,
  icon,
}: {
  title?: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="rounded-2xl bg-white/[0.05] p-4 text-slate-500">
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {body && <p className="max-w-md text-sm text-slate-400">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  body = 'We could not load this content. Check your connection and try again.',
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-3 border-rose-500/20 px-6 py-14 text-center">
      <div className="rounded-2xl bg-rose-500/10 p-4 text-rose-400">
        <AlertOctagon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="max-w-md text-sm text-slate-400">{body}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-neon-cyan" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone = 'cyan' }: { value: number; max?: number; tone?: 'cyan' | 'purple' | 'pink' | 'lime' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const bar =
    tone === 'purple'
      ? 'from-violet-500 to-purple-400'
      : tone === 'pink'
        ? 'from-rose-500 to-pink-400'
        : tone === 'lime'
          ? 'from-lime-500 to-emerald-400'
          : 'from-cyan-400 to-blue-500';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', bar)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
