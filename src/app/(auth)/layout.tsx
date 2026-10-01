import type { ReactNode } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { Providers } from '@/components/providers';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="relative flex min-h-screen flex-col">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute inset-0 bg-hero-radial" />
        <header className="relative z-10 flex items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan to-neon-blue">
              <Trophy className="h-5 w-5 text-void-950" />
            </div>
            <div>
              <span className="font-display text-lg font-black tracking-[0.18em] text-white">
                NEXUS
              </span>
              <span className="ml-1.5 font-display text-lg font-light tracking-[0.28em] text-neon-cyan">
                ARENA
              </span>
            </div>
          </Link>
          <Link href="/" className="text-sm text-slate-400 transition hover:text-white">
            ← Back to home
          </Link>
        </header>
        <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
          {children}
        </main>
      </div>
    </Providers>
  );
}
