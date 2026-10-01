'use client';

import Link from 'next/link';
import { Users, IndianRupee, Trophy, Calendar, Gamepad2 } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge, FormatBadge } from '@/components/ui/misc';
import { ProgressBar } from '@/components/ui/states';

export interface TournamentCardData {
  _id: string;
  title: string;
  slug: string;
  tagline?: string;
  status: string;
  format: string;
  type: string;
  entryFee: number;
  prizePool: number;
  startsAt: string;
  participantsCount: number;
  maxParticipants: number;
  region?: string;
  featured?: boolean;
  game?: { name?: string; slug?: string; accentColor?: string } | null;
  bannerUrl?: string;
}

export function TournamentCard({ t, compact }: { t: TournamentCardData; compact?: boolean }) {
  const fillPct = Math.round((t.participantsCount / Math.max(1, t.maxParticipants)) * 100);
  const accent = t.game?.accentColor ?? '#00f0ff';

  return (
    <Link
      href={`/tournaments/${t.slug}`}
      className={cn(
        'glass glass-hover group relative flex flex-col overflow-hidden',
        t.featured && 'ring-1 ring-neon-cyan/25',
      )}
    >
      {/* Banner */}
      <div
        className={cn('relative h-36 overflow-hidden', compact && 'h-24')}
        style={{
          background: t.bannerUrl
            ? `url(${t.bannerUrl}) center/cover`
            : `radial-gradient(ellipse 90% 120% at 20% 0%, ${accent}33, transparent 60%), radial-gradient(ellipse 80% 100% at 90% 20%, #8b5cf62e, transparent 55%), #0d1022`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-void-950 via-void-950/35 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <StatusBadge status={t.status} />
          {t.featured && <span className="badge bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30">★ Featured</span>}
        </div>
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 rounded-lg bg-black/45 px-2.5 py-1.5 text-xs text-slate-300 backdrop-blur">
          <Gamepad2 className="h-3.5 w-3.5" style={{ color: accent }} />
          {t.game?.name ?? 'Game'}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-bold leading-snug text-white transition group-hover:text-neon-cyan">
          {t.title}
        </h3>
        {t.tagline && <p className="mt-1 line-clamp-1 text-xs text-slate-500">{t.tagline}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <FormatBadge format={t.format} />
          <span className="badge bg-white/[0.05] text-slate-300 border-white/10">
            {t.type === 'team' ? 'Team' : t.type === 'duo' ? 'Duo' : 'Solo'}
          </span>
          {t.region && (
            <span className="badge bg-white/[0.05] text-slate-300 border-white/10">{t.region}</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Trophy className="h-3 w-3" /> Prize Pool
            </p>
            <p className="mt-1 font-display text-base font-bold text-neon-cyan">
              {formatCurrency(t.prizePool)}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <IndianRupee className="h-3 w-3" /> Entry
            </p>
            <p className="mt-1 font-display text-base font-bold text-white">
              {t.entryFee === 0 ? (
                <span className="text-emerald-400">FREE</span>
              ) : (
                formatCurrency(t.entryFee)
              )}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {t.participantsCount}/{t.maxParticipants} registered
            </span>
            <span className="text-slate-500">{fillPct}%</span>
          </div>
          <ProgressBar value={fillPct} tone={fillPct > 85 ? 'pink' : 'cyan'} />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(t.startsAt)}
          </span>
          <span className="btn-secondary btn-sm pointer-events-none group-hover:border-neon-cyan/50 group-hover:text-neon-cyan">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
