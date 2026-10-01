'use client';

import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Shield } from 'lucide-react';
import { cn, getInitials, formatCurrency, formatDate } from '@/lib/utils';

/* ─────────────────────────────── BADGES ─────────────────────────────── */
const STATUS_STYLES: Record<string, string> = {
  registration: 'badge-open',
  open: 'badge-open',
  upcoming: 'badge-upcoming',
  ongoing: 'badge-live',
  live: 'badge-live',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
  draft: 'badge-draft',
  pending: 'badge-upcoming',
  scheduled: 'badge-upcoming',
  confirmed: 'badge-open',
  walkover: 'badge-completed',
  captured: 'badge-open',
  failed: 'badge-cancelled',
  refunded: 'badge-completed',
  partially_refunded: 'badge-completed',
  created: 'badge-draft',
  authorized: 'badge-upcoming',
  disqualified: 'badge-cancelled',
  waitlist: 'badge-draft',
  active: 'badge-open',
  suspended: 'badge-draft',
  banned: 'badge-cancelled',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn(STATUS_STYLES[status] ?? 'badge-neon', className)}>
      {status === 'ongoing' || status === 'live' ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
      ) : null}
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function FormatBadge({ format }: { format: string }) {
  const labels: Record<string, string> = {
    single_elimination: 'Single Elim',
    double_elimination: 'Double Elim',
    round_robin: 'Round Robin',
    swiss: 'Swiss',
    group_knockout: 'Groups + Playoffs',
    custom: 'Custom',
  };
  return <span className="badge-neon">{labels[format] ?? format}</span>;
}

/* ─────────────────────────────── AVATAR ─────────────────────────────── */
export function Avatar({
  name,
  src,
  color = '#00f0ff',
  size = 'md',
  className,
}: {
  name: string;
  src?: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = { xs: 'h-7 w-7 text-[10px]', sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-xl' };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover ring-1 ring-white/10', sizes[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold ring-1 ring-white/10',
        sizes[size],
        className,
      )}
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {getInitials(name)}
    </div>
  );
}

/* ───────────────────────────── PAGINATION ───────────────────────────── */
export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-neon-cyan/40 hover:text-white disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              'h-9 w-9 rounded-lg text-sm font-medium transition',
              p === page
                ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-void-950'
                : 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
            )}
          >
            {p}
          </button>
        );
      })}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-neon-cyan/40 hover:text-white disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────────── TABS ──────────────────────────────── */
export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn('tab-btn', active === t.id && 'tab-active')}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────────── MISC BITS ───────────────────────────── */
export function PrizeRow({ position, amount, label }: { position: number; amount: number; label?: string }) {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">{medals[position] ?? <Trophy className="h-4 w-4 text-slate-500" />}</span>
        <div>
          <p className="text-sm font-medium text-white">{label || `Position ${position}`}</p>
          <p className="text-xs text-slate-500">Rank #{position}</p>
        </div>
      </div>
      <p className="font-display text-sm font-bold text-neon-cyan">{formatCurrency(amount)}</p>
    </div>
  );
}

export function InfoRow({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium text-slate-200">{value}</span>
    </div>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    super_admin: 'badge bg-amber-500/15 text-amber-300 border-amber-400/30',
    admin: 'badge bg-rose-500/15 text-rose-300 border-rose-400/30',
    moderator: 'badge bg-violet-500/15 text-violet-300 border-violet-400/30',
    organizer: 'badge bg-sky-500/15 text-sky-300 border-sky-400/30',
    player: 'badge bg-white/[0.06] text-slate-300 border-white/10',
  };
  return (
    <span className={styles[role] ?? styles.player}>
      <Shield className="h-3 w-3" />
      {role.replace(/_/g, ' ')}
    </span>
  );
}

export function DateText({ date }: { date: string | Date | undefined | null }) {
  return <span className="text-slate-400">{formatDate(date)}</span>;
}
