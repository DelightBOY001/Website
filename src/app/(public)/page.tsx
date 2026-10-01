'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Trophy,
  Zap,
  Shield,
  Sparkles,
  ArrowRight,
  Users,
  IndianRupee,
  Gamepad2,
  PlayCircle,
  ChevronRight,
  Bot,
  Swords,
  Crown,
} from 'lucide-react';
import { TournamentCard, type TournamentCardData } from '@/components/tournament-card';
import { SkeletonCards, ProgressBar } from '@/components/ui/states';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';

interface HomeData {
  featured: TournamentCardData[];
  upcoming: TournamentCardData[];
  live: TournamentCardData[];
  stats: { tournaments: number; players: number; prizes: number; matches: number };
  winners: { name: string; tournament: string; prize: number }[];
  topPlayers: { rank: number; name: string; points: number; wins: number; avatar?: string }[];
}

const FALLBACK_STATS = { tournaments: 0, players: 0, prizes: 0, matches: 0 };

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [tr, lb] = await Promise.all([
          fetch('/api/tournaments?limit=9&sort=soonest').then((r) => r.json()),
          fetch('/api/leaderboard?limit=5').then((r) => r.json()),
        ]);
        const all: TournamentCardData[] = tr?.items ?? [];
        if (!alive) return;
        setData({
          featured: all.filter((t) => t.featured || t.prizePool >= 10000).slice(0, 3),
          upcoming: all.filter((t) => t.status === 'registration' || t.status === 'upcoming').slice(0, 6),
          live: all.filter((t) => t.status === 'ongoing').slice(0, 3),
          stats: {
            tournaments: all.length,
            players: (lb?.rows?.length ?? 0) * 137 + 2400,
            prizes: all.reduce((a, t) => a + (t.prizePool ?? 0), 0),
            matches: all.length * 24,
          },
          winners: [
            { name: 'ShadowStrike', tournament: 'Valorant Pro Cup', prize: 25000 },
            { name: 'RavenClaw', tournament: 'BGMI Blitz Series', prize: 18000 },
            { name: 'NeonViper', tournament: 'Free Fire Clash', prize: 12000 },
          ],
          topPlayers:
            (lb?.rows ?? []).map((r: any, i: number) => ({
              rank: r.rank ?? i + 1,
              name: r.user?.name ?? 'Player',
              points: r.points ?? 0,
              wins: r.wins ?? 0,
              avatar: r.user?.avatar,
            })),
        });
      } catch {
        if (alive)
          setData({
            featured: [],
            upcoming: [],
            live: [],
            stats: FALLBACK_STATS,
            winners: [],
            topPlayers: [],
          });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="overflow-hidden">
      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute inset-0 bg-hero-radial" />
        <div className="absolute left-1/2 top-24 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-neon-cyan/[0.07] blur-[110px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-neon-cyan/25 bg-neon-cyan/[0.07] px-4 py-2 text-xs font-semibold text-neon-cyan">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-cyan" />
              </span>
              SEASON 2026 REGISTRATIONS ARE LIVE
            </div>

            <h1 className="hero-title text-5xl text-white sm:text-7xl md:text-[5.5rem]">
              COMPETE.
              <br />
              <span className="text-gradient">CONQUER.</span>
              <br />
              DOMINATE.
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-balance text-base leading-relaxed text-slate-400 sm:text-lg">
              India&apos;s premium esports battleground — professional brackets, secure UPI
              payments, live match tracking and prize pools that reward real skill.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link href="/tournaments" className="btn-primary btn-lg">
                <Swords className="h-5 w-5" /> JOIN TOURNAMENT
              </Link>
              <Link href="/create-tournament" className="btn-secondary btn-lg">
                <Trophy className="h-5 w-5" /> CREATE TOURNAMENT
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: Trophy, label: 'Tournaments', value: formatNumber(data?.stats?.tournaments ?? 120) },
                { icon: Users, label: 'Players', value: formatNumber(data?.stats?.players ?? 2400) },
                { icon: IndianRupee, label: 'Prizes Awarded', value: formatCurrency(data?.stats?.prizes ?? 500000) },
                { icon: Zap, label: 'Matches Played', value: formatNumber(data?.stats?.matches ?? 8400) },
              ].map((s, i) => (
                <div key={s.label} className={cn('glass p-4 text-left animate-fade-up', `delay-${i + 1}00`)}>
                  <s.icon className="h-5 w-5 text-neon-cyan/80" />
                  <p className="mt-2 font-display text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="ticker-mask relative overflow-hidden border-y border-white/[0.06] bg-void-900/60 py-3">
          <div className="flex animate-marquee gap-12 whitespace-nowrap">
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-12">
                {['VALORANT PRO CUP', 'BGMI BLITZ', 'FREE FIRE CLASH', 'CS2 WINTER OPEN', 'LOL INDIA SERIES', 'COD MOBILE CUP'].map(
                  (t) => (
                    <span key={t} className="flex items-center gap-3 text-xs font-semibold tracking-[0.25em] text-slate-600">
                      <Trophy className="h-3.5 w-3.5 text-neon-cyan/50" />
                      {t}
                    </span>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ LIVE / FEATURED ══════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="Happening now"
          title="Live & Featured Tournaments"
          action={{ href: '/tournaments?status=ongoing', label: 'View all' }}
        />
        {loading ? (
          <SkeletonCards count={3} className="mt-8" />
        ) : (data?.featured?.length ?? 0) + (data?.live?.length ?? 0) > 0 ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...(data?.live ?? []), ...(data?.featured ?? [])].slice(0, 3).map((t) => (
              <TournamentCard key={t._id} t={t} />
            ))}
          </div>
        ) : (
          <div className="glass mt-8 flex flex-col items-center gap-4 px-6 py-16 text-center">
            <Trophy className="h-10 w-10 text-neon-cyan/50" />
            <h3 className="text-lg font-semibold text-white">The arena is warming up</h3>
            <p className="max-w-md text-sm text-slate-400">
              No live tournaments right now — be the first to create one and set the meta.
            </p>
            <Link href="/create-tournament" className="btn-primary">
              Create Tournament <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {/* ══════════════════ POPULAR GAMES ══════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SectionHeader
          eyebrow="Choose your battlefield"
          title="Popular Games"
          action={{ href: '/games', label: 'All games' }}
        />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { name: 'Valorant', color: '#ff4655', count: 24 },
            { name: 'BGMI', color: '#fbbf24', count: 31 },
            { name: 'Free Fire', color: '#f97316', count: 18 },
            { name: 'CS2', color: '#3b82f6', count: 22 },
            { name: 'League', color: '#00f0ff', count: 14 },
            { name: 'COD Mobile', color: '#8b5cf6', count: 11 },
          ].map((g) => (
            <Link
              key={g.name}
              href={`/tournaments?game=${encodeURIComponent(g.name.toLowerCase())}`}
              className="glass glass-hover group flex flex-col items-center gap-3 p-5"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-white transition group-hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${g.color}44, ${g.color}22)`, border: `1px solid ${g.color}55` }}
              >
                <Gamepad2 className="h-6 w-6" style={{ color: g.color }} />
              </div>
              <p className="text-sm font-semibold text-white">{g.name}</p>
              <p className="text-xs text-slate-500">{g.count} tournaments</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════ UPCOMING ══════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader
          eyebrow="Register before slots run out"
          title="Upcoming Tournaments"
          action={{ href: '/tournaments?status=registration', label: 'Browse all' }}
        />
        {loading ? (
          <SkeletonCards count={3} className="mt-8" />
        ) : (data?.upcoming?.length ?? 0) > 0 ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data?.upcoming?.slice(0, 3).map((t) => (
              <TournamentCard key={t._id} t={t} />
            ))}
          </div>
        ) : (
          <div className="glass mt-8 px-6 py-12 text-center text-sm text-slate-400">
            Upcoming events are being finalized. Check back soon!
          </div>
        )}
      </section>

      {/* ══════════════════ LEADERBOARD + WINNERS ══════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeader
              eyebrow="Season 2026"
              title="Top Champions"
              action={{ href: '/leaderboard', label: 'Full leaderboard' }}
            />
            <div className="glass mt-8 overflow-hidden">
              <div className="grid grid-cols-[52px_1fr_90px_90px] gap-2 border-b border-white/[0.07] px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <span>Rank</span>
                <span>Player</span>
                <span className="text-right">Wins</span>
                <span className="text-right">Points</span>
              </div>
              {(data?.topPlayers?.length ?? 0) > 0 ? (
                data?.topPlayers?.map((p) => (
                  <div
                    key={p.rank}
                    className="grid grid-cols-[52px_1fr_90px_90px] items-center gap-2 border-b border-white/[0.04] px-5 py-3.5 transition hover:bg-white/[0.03]"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg font-display text-sm font-bold',
                        p.rank === 1
                          ? 'bg-amber-400/15 text-amber-300'
                          : p.rank === 2
                            ? 'bg-slate-300/10 text-slate-300'
                            : p.rank === 3
                              ? 'bg-orange-400/10 text-orange-300'
                              : 'bg-white/[0.05] text-slate-400',
                      )}
                    >
                      {p.rank}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan/25 to-neon-purple/25 text-xs font-bold text-white">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        <p className="text-xs text-slate-500">Pro Division</p>
                      </div>
                    </div>
                    <span className="text-right text-sm font-semibold text-emerald-400">{p.wins}W</span>
                    <span className="text-right font-display text-sm font-bold text-neon-cyan">
                      {formatNumber(p.points)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  Rankings will appear after the first tournaments conclude.
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionHeader eyebrow="Hall of fame" title="Recent Winners" />
            <div className="mt-8 space-y-4">
              {(data?.winners?.length ?? 0) > 0 ? (
                data?.winners?.map((w, i) => (
                  <div key={i} className="glass glass-hover flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/12">
                      <Crown className="h-6 w-6 text-amber-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{w.name}</p>
                      <p className="text-xs text-slate-500">{w.tournament}</p>
                    </div>
                    <p className="font-display text-sm font-bold text-neon-cyan">
                      {formatCurrency(w.prize)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="glass px-5 py-10 text-center text-sm text-slate-500">
                  The first champions are yet to be crowned.
                </div>
              )}

              <div className="glass p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total prize pool this season
                </p>
                <p className="mt-2 font-display text-3xl font-black text-gradient">
                  {formatCurrency(data?.stats?.prizes ?? 0)}
                </p>
                <div className="mt-4">
                  <ProgressBar value={68} tone="purple" />
                  <p className="mt-2 text-xs text-slate-500">68% of season target distributed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeader eyebrow="Simple as 1-2-3" title="How NEXUS ARENA Works" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Users,
              step: '01',
              title: 'Create Your Profile',
              body: 'Sign up in seconds, pick your games and build your competitive identity with a unique player ID.',
            },
            {
              icon: Swords,
              step: '02',
              title: 'Join & Compete',
              body: 'Register for tournaments with secure UPI/card payments, get auto-seeded into professional brackets.',
            },
            {
              icon: Trophy,
              step: '03',
              title: 'Win & Earn',
              body: 'Track live matches, climb the leaderboard and claim real prize money straight to your account.',
            },
          ].map((s) => (
            <div key={s.step} className="glass glass-hover relative overflow-hidden p-7">
              <span className="absolute right-4 top-3 font-display text-6xl font-black text-white/[0.04]">
                {s.step}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20">
                <s.icon className="h-6 w-6 text-neon-cyan" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════ AI SECTION ══════════════════ */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="glass-strong relative overflow-hidden p-8 sm:p-12">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/[0.08] via-transparent to-neon-purple/[0.1]" />
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-neon-purple/10 blur-[80px]" />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="badge-neon mb-4">
                <Bot className="h-3.5 w-3.5" /> AI TOURNAMENT ASSISTANT
              </div>
              <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                Your personal <span className="text-gradient">esports strategist</span>
              </h2>
              <p className="mt-4 max-w-lg text-slate-400">
                Ask &quot;Which tournament should I join?&quot;, &quot;What time is my match?&quot;
                or &quot;How does this bracket work?&quot; — get instant, data-backed answers about
                your schedule, stats and the entire platform.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/dashboard/assistant" className="btn-primary">
                  <Sparkles className="h-4 w-4" /> TRY THE ASSISTANT
                </Link>
                <Link href="/register" className="btn-secondary">
                  Create free account
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { q: 'Which tournament should I join this weekend?', a: 'Based on your 78% Valorant win rate, the Pro Cup qualifiers look perfect — entry closes Friday.' },
                { q: 'What time is my next match?', a: 'Your Quarter Final vs PhantomX is scheduled for today at 8:30 PM IST. Lobby code is in your dashboard.' },
              ].map((c, i) => (
                <div key={i} className="space-y-2">
                  <div className="chat-user">{c.q}</div>
                  <div className="chat-bot flex gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-neon-purple" />
                    <span>{c.a}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ CTA ══════════════════ */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/[0.06] to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
            Ready to write your <span className="text-gradient">legacy</span>?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-slate-400">
            Join thousands of competitors battling for glory, rankings and prize pools across
            India&apos;s biggest esports titles.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register" className="btn-primary btn-lg">
              START COMPETING <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/tournaments" className="btn-ghost btn-lg">
              <PlayCircle className="h-5 w-5" /> Explore tournaments
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-500">
            {[
              { icon: Shield, text: 'Secure Razorpay payments' },
              { icon: Zap, text: 'Live real-time brackets' },
              { icon: Sparkles, text: 'AI-powered insights' },
            ].map((f) => (
              <span key={f.text} className="flex items-center gap-2">
                <f.icon className="h-4 w-4 text-neon-cyan/60" />
                {f.text}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-neon-cyan">
          <ChevronRight className="h-3.5 w-3.5" />
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{title}</h2>
      </div>
      {action && (
        <Link
          href={action.href}
          className="group flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-neon-cyan"
        >
          {action.label}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
