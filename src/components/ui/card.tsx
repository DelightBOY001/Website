'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-1', className)}>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('px-5 py-4 border-t border-white/[0.06]', className)}>{children}</div>
  );
}

/** A premium stat tile for dashboards. */
export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'cyan',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: 'cyan' | 'purple' | 'pink' | 'lime';
}) {
  const glow =
    tone === 'purple'
      ? 'stat-glow-purple'
      : tone === 'pink'
        ? 'stat-glow-pink'
        : tone === 'lime'
          ? 'stat-glow-lime'
          : 'stat-glow-cyan';
  return (
    <div className={cn('glass glass-hover p-5', glow)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        {icon && <div className="text-neon-cyan/70">{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
