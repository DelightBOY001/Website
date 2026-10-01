'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  Trophy,
  Bell,
  LogOut,
  LayoutDashboard,
  Shield,
  PlusCircle,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/misc';

const PUBLIC_LINKS = [
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/games', label: 'Games' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/teams', label: 'Teams' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, isAdmin, isStaff, isOrganizer } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () =>
      fetch('/api/notifications?limit=1', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => {
          if (alive && typeof j.unread === 'number') setUnread(j.unread);
        })
        .catch(() => undefined);
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled ? 'glass-strong border-b border-white/[0.08]' : 'bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan to-neon-blue shadow-neon-sm">
              <Trophy className="h-5 w-5 text-void-950" />
            </div>
            <div className="leading-none">
              <span className="font-display text-lg font-black tracking-[0.18em] text-white">
                NEXUS
              </span>
              <span className="ml-1.5 font-display text-lg font-light tracking-[0.28em] text-neon-cyan">
                ARENA
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {PUBLIC_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-medium transition-all',
                  pathname.startsWith(l.href)
                    ? 'text-neon-cyan bg-neon-cyan/[0.08]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]',
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-2.5 lg:flex">
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-white/[0.06]" />
          ) : user ? (
            <>
              {isOrganizer && (
                <Link
                  href="/create-tournament"
                  className="btn-secondary btn-sm"
                >
                  <PlusCircle className="h-4 w-4" /> Create
                </Link>
              )}
              <Link
                href="/dashboard/assistant"
                className="btn-ghost btn-sm"
                title="AI Assistant"
              >
                <Sparkles className="h-4 w-4 text-neon-purple" />
              </Link>
              <Link
                href="/dashboard/notifications"
                className="relative rounded-lg p-2 text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-neon-pink px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <div className="group relative">
                <button className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 transition hover:border-neon-cyan/30">
                  <Avatar name={user.name} src={user.avatar} color="#00f0ff" size="xs" />
                  <span className="max-w-[110px] truncate text-sm font-medium text-white">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
                <div className="invisible absolute right-0 top-full w-56 translate-y-2 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="glass-strong overflow-hidden rounded-xl p-1.5">
                    <Link href="/dashboard" className="nav-link">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link href="/dashboard/profile" className="nav-link">
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    {isStaff && (
                      <Link href="/admin" className="nav-link">
                        <Shield className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="nav-link w-full text-left text-rose-400 hover:text-rose-300"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary btn-sm">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile trigger */}
        <button
          className="rounded-lg border border-white/10 p-2 text-white lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="glass-strong animate-slide-in border-t border-white/[0.08] px-4 pb-6 pt-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {PUBLIC_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-medium',
                  pathname.startsWith(l.href)
                    ? 'bg-neon-cyan/[0.1] text-neon-cyan'
                    : 'text-slate-300 hover:bg-white/[0.05]',
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-white/[0.08]" />
            {user ? (
              <>
                <Link href="/dashboard" className="nav-link">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <Link href="/dashboard/notifications" className="nav-link">
                  <Bell className="h-4 w-4" /> Notifications
                  {unread > 0 && (
                    <span className="ml-auto rounded-full bg-neon-pink px-2 py-0.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>
                <Link href="/dashboard/assistant" className="nav-link">
                  <Sparkles className="h-4 w-4 text-neon-purple" /> AI Assistant
                </Link>
                {isOrganizer && (
                  <Link href="/create-tournament" className="nav-link">
                    <PlusCircle className="h-4 w-4" /> Create Tournament
                  </Link>
                )}
                {isStaff && (
                  <Link href="/admin" className="nav-link">
                    <Shield className="h-4 w-4" /> Admin Panel
                  </Link>
                )}
                <button onClick={logout} className="nav-link text-left text-rose-400">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/login" className="btn-secondary">
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
