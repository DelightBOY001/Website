'use client';

import Link from 'next/link';
import { Gamepad2, Trophy, Users } from 'lucide-react';
import { useFetch } from '@/hooks/useData';
import { SkeletonCards, EmptyState } from '@/components/ui/states';

interface Game {
  _id: string;
  name: string;
  slug: string;
  genre: string;
  publisher: string;
  description: string;
  accentColor: string;
  tournamentCount: number;
  playerCount: number;
  platforms: string[];
}

export default function GamesPage() {
  const { data, loading } = useFetch<{ items: Game[] }>('/api/games');

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-cyan">
          Pick your battlefield
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Games</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          From tactical shooters to battle royales — compete across the biggest esports titles.
        </p>
      </div>

      <div className="mt-12">
        {loading ? (
          <SkeletonCards count={6} />
        ) : (data?.items?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Gamepad2 className="h-8 w-8" />}
            title="Games coming soon"
            body="The catalogue is being built. Check back shortly!"
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items?.map((g) => (
              <Link
                key={g._id}
                href={`/tournaments?game=${g.slug}`}
                className="glass glass-hover group relative overflow-hidden"
              >
                <div
                  className="relative h-44"
                  style={{
                    background: `radial-gradient(ellipse 100% 120% at 20% 0%, ${g.accentColor}44, transparent 60%), radial-gradient(ellipse 80% 100% at 95% 90%, ${g.accentColor}22, transparent 55%), #0d1022`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-void-950/90 to-transparent" />
                  <div
                    className="absolute left-5 top-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${g.accentColor}44, ${g.accentColor}11)`,
                      border: `1px solid ${g.accentColor}66`,
                    }}
                  >
                    <Gamepad2 className="h-7 w-7" style={{ color: g.accentColor }} />
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="font-display text-lg font-bold text-white transition group-hover:text-neon-cyan">
                    {g.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {g.publisher || 'Independent'} · {g.genre || 'Esports'}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-400">{g.description}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-amber-300" />
                      {g.tournamentCount} tournaments
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-neon-cyan" />
                      {(g.playerCount ?? 0).toLocaleString('en-IN')} players
                    </span>
                  </div>
                  {g.platforms?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {g.platforms.map((p) => (
                        <span key={p} className="badge bg-white/[0.04] text-slate-400 border-white/10">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
