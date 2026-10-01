'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Radio, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BracketMatchNode, BracketRoundView, BracketView } from '@/types';

const ZOOM_LEVELS = [0.55, 0.7, 0.85, 1, 1.2, 1.5];

interface Box {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Professional interactive tournament bracket.
 *
 * - Horizontal scrollable round columns (desktop + mobile)
 * - SVG connectors measured from the live DOM (bezier paths)
 * - Zoom + fit controls, round navigation on mobile
 * - Live match highlighting, winner advancement glow
 */
export function BracketViewComponent({
  bracket,
  liveMode = false,
}: {
  bracket: BracketView;
  liveMode?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [boxes, setBoxes] = useState<Map<number, Box>>(new Map());
  const [zoom, setZoom] = useState(0.85);
  const [full, setFull] = useState(false);
  const [showLosers, setShowLosers] = useState(false);
  const [activeRound, setActiveRound] = useState(0);

  const rounds: BracketRoundView[] = useMemo(() => {
    const main = bracket.rounds ?? [];
    if (bracket.type === 'double_elimination' && bracket.losersRounds?.length) {
      return showLosers ? (bracket.losersRounds as BracketRoundView[]) : main;
    }
    return main;
  }, [bracket, showLosers]);

  // Group rounds (group stage) get their own tabs.
  const groupTabs = useMemo(() => bracket.groups ?? [], [bracket.groups]);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const next = new Map<number, Box>();
    matchRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      next.set(id, {
        id,
        left: r.left - stageRect.left,
        top: r.top - stageRect.top,
        width: r.width,
        height: r.height,
      });
    });
    setBoxes(next);
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    const t = setTimeout(measure, 300);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [measure, rounds, zoom, full]);

  useEffect(() => {
    // Fonts/layout settle
    const t = setTimeout(measure, 600);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const connectors = useMemo(() => {
    const paths: { d: string; active: boolean; key: string }[] = [];
    if (!stageRef.current) return paths;
    for (const round of rounds) {
      for (const m of round.matches) {
        if (!m.nextMatchNumber) continue;
        const from = boxes.get(m.matchNumber);
        const to = boxes.get(m.nextMatchNumber);
        if (!from || !to) continue;
        const x1 = from.left + from.width;
        const y1 = from.top + from.height / 2;
        const x2 = to.left;
        const y2 = to.top + to.height / 2;
        const midX = x1 + Math.max(18, (x2 - x1) / 2);
        const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
        paths.push({
          key: `w-${m.matchNumber}-${m.nextMatchNumber}`,
          d,
          active: m.status === 'completed' && Boolean(m.winner?.name),
        });
      }
    }
    return paths;
  }, [boxes, rounds]);

  const registerMatch = useCallback((num: number, el: HTMLElement | null) => {
    if (el) matchRefs.current.set(num, el);
    else matchRefs.current.delete(num);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 420, behavior: 'smooth' });
  };

  const maxRounds = rounds.length;

  return (
    <div className={cn('relative', full && 'fixed inset-0 z-[60] bg-void-950/98 p-4')}>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {bracket.type === 'double_elimination' && (bracket.losersRounds?.length ?? 0) > 0 && (
            <div className="flex rounded-lg border border-white/[0.1] p-0.5">
              <button
                onClick={() => setShowLosers(false)}
                className={cn('tab-btn text-xs', !showLosers && 'tab-active')}
              >
                Winners
              </button>
              <button
                onClick={() => setShowLosers(true)}
                className={cn('tab-btn text-xs', showLosers && 'tab-active')}
              >
                Losers
              </button>
            </div>
          )}
          {liveMode && (
            <span className="badge-live">
              <Radio className="h-3 w-3" /> Live updates
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(z) - 1)] ?? z)}
            className="rounded-lg border border-white/[0.1] p-2 text-slate-400 transition hover:border-neon-cyan/40 hover:text-white"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(z) + 1)] ?? z)}
            className="rounded-lg border border-white/[0.1] p-2 text-slate-400 transition hover:border-neon-cyan/40 hover:text-white"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setFull((f) => !f)}
            className="rounded-lg border border-white/[0.1] p-2 text-slate-400 transition hover:border-neon-cyan/40 hover:text-white"
            aria-label="Toggle fullscreen"
          >
            {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile round navigation */}
      {maxRounds > 1 && (
        <div className="mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              const next = Math.max(0, activeRound - 1);
              setActiveRound(next);
              scrollRef.current?.scrollTo({ left: next * 320, behavior: 'smooth' });
            }}
            className="shrink-0 rounded-lg border border-white/[0.1] p-2 text-slate-400 lg:hidden"
            aria-label="Previous round"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {rounds.map((r, i) => (
            <button
              key={`${r.stage}-${r.number}`}
              onClick={() => {
                setActiveRound(i);
                scrollRef.current?.scrollTo({ left: i * 320, behavior: 'smooth' });
              }}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition',
                i === activeRound
                  ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan'
                  : 'border-white/[0.08] text-slate-400',
              )}
            >
              {r.name}
            </button>
          ))}
          <button
            onClick={() => {
              const next = Math.min(maxRounds - 1, activeRound + 1);
              setActiveRound(next);
              scrollRef.current?.scrollTo({ left: next * 320, behavior: 'smooth' });
            }}
            className="shrink-0 rounded-lg border border-white/[0.1] p-2 text-slate-400 lg:hidden"
            aria-label="Next round"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stage */}
      <div
        ref={scrollRef}
        className={cn(
          'bracket-scroll relative overflow-auto rounded-2xl border border-white/[0.07] bg-void-900/40',
          full ? 'h-[calc(100vh-13rem)]' : 'h-[560px] sm:h-[620px]',
        )}
      >
        <div
          ref={stageRef}
          className="relative min-w-max origin-top-left p-8"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* SVG connectors */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {connectors.map((c) => (
              <path
                key={c.key}
                d={c.d}
                fill="none"
                stroke={c.active ? 'rgba(0, 240, 255, 0.45)' : 'rgba(37, 43, 92, 0.9)'}
                strokeWidth={2}
                strokeDasharray={c.active ? undefined : '5 5'}
              />
            ))}
          </svg>

          <div className="flex items-stretch gap-16">
            {rounds.map((round, ri) => (
              <div key={`${round.stage}-${round.number}-${ri}`} className="flex w-[264px] flex-col">
                <div className="mb-5 text-center">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    {round.name}
                  </p>
                  <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-r from-transparent via-neon-cyan/40 to-transparent" />
                </div>
                <div
                  className="flex flex-1 flex-col justify-around gap-4"
                  style={{ minHeight: 460 }}
                >
                  {(round.matches ?? []).map((m) => (
                    <MatchCard
                      key={`${round.number}-${m.matchNumber}`}
                      match={m}
                      register={registerMatch}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {groupTabs.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Group stage
          </p>
          <div className="flex flex-wrap gap-2">
            {groupTabs.map((g) => (
              <div key={g.id} className="glass px-4 py-2 text-xs text-slate-300">
                <span className="font-semibold text-white">{g.name}</span>
                <span className="ml-2 text-slate-500">{g.rounds.reduce((a, r) => a + (r.matches ?? []).length, 0)} matches</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  register,
}: {
  match: BracketMatchNode;
  register: (num: number, el: HTMLElement | null) => void;
}) {
  const ref = useCallback(
    (el: HTMLElement | null) => register(match.matchNumber, el),
    [match.matchNumber, register],
  );

  const isLive = match.status === 'live';
  const isDone = match.status === 'completed' || match.status === 'walkover';
  const p1Win = isDone && match.winner?.name === match.participant1.name && Boolean(match.winner.name);
  const p2Win = isDone && match.winner?.name === match.participant2.name && Boolean(match.winner.name);

  return (
    <div
      ref={ref}
      className={cn(
        'bracket-card relative w-[264px]',
        isLive && 'animate-pulseGlow border-red-500/40',
        match.isBye && 'opacity-60',
      )}
    >
      {isLive && (
        <div className="absolute -left-px top-0 h-full w-[3px] rounded-l-xl bg-gradient-to-b from-red-500 to-rose-400" />
      )}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {match.isThirdPlace ? '3rd Place' : `Match #${match.matchNumber}`}
        </span>
        <span
          className={cn(
            'text-[9px] font-bold uppercase tracking-wider',
            isLive ? 'text-red-400' : isDone ? 'text-emerald-400/80' : 'text-slate-500',
          )}
        >
          {match.isBye ? 'BYE' : match.status}
        </span>
      </div>

      <ParticipantRow
        name={match.participant1.name}
        score={match.participant1.score}
        seed={match.participant1.seed}
        winner={p1Win}
        loser={isDone && !p1Win}
        kind={match.participant1.kind}
      />
      <div className="h-px bg-white/[0.06]" />
      <ParticipantRow
        name={match.participant2.name}
        score={match.participant2.score}
        seed={match.participant2.seed}
        winner={p2Win}
        loser={isDone && !p2Win}
        kind={match.participant2.kind}
      />
    </div>
  );
}

function ParticipantRow({
  name,
  score,
  seed,
  winner,
  loser,
  kind,
}: {
  name: string;
  score: number;
  seed?: number;
  winner: boolean;
  loser: boolean;
  kind: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-3 py-2 transition-colors',
        winner && 'bg-emerald-500/[0.08]',
        loser && 'opacity-55',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {seed ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[9px] font-bold text-slate-400">
            {seed}
          </span>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <span
          className={cn(
            'truncate text-xs',
            winner ? 'font-semibold text-white' : 'text-slate-300',
            kind === 'tbd' && 'italic text-slate-600',
            kind === 'bye' && 'italic text-slate-600',
          )}
        >
          {name || 'TBD'}
        </span>
      </div>
      <span
        className={cn(
          'flex h-6 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold',
          winner
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'bg-white/[0.05] text-slate-400',
        )}
      >
        {score ?? 0}
      </span>
    </div>
  );
}
