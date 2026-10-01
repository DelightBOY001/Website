import Link from 'next/link';
import { Trophy, MessageCircle, Play, Camera, Globe } from 'lucide-react';

const columns = [
  {
    title: 'Platform',
    links: [
      { href: '/tournaments', label: 'Tournaments' },
      { href: '/games', label: 'Games' },
      { href: '/leaderboard', label: 'Leaderboard' },
      { href: '/teams', label: 'Teams' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/contact', label: 'Contact' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms & Conditions' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/refunds', label: 'Refund Policy' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/[0.07] bg-void-900/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
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
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              India&apos;s competitive gaming battleground. Real brackets, secure UPI payments,
              live matches and real prizes.
            </p>
            <div className="mt-5 flex gap-3">
              {[Globe, Play, Camera, MessageCircle].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="rounded-lg border border-white/[0.08] p-2.5 text-slate-500 transition hover:border-neon-cyan/40 hover:text-neon-cyan"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-500 transition hover:text-neon-cyan"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pt-8 sm:flex-row">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} NEXUS ARENA. All rights reserved. Built for champions.
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            All systems operational
          </p>
        </div>
      </div>
    </footer>
  );
}
