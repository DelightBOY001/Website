'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Trophy,
  Swords,
  Users,
  CreditCard,
  Bell,
  Settings,
  Sparkles,
  Shield,
  UserRound,
  ChevronLeft,
  Gamepad2,
  Flag,
  FileBarChart,
  ScrollText,
  Home,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Navbar } from './navbar';
import { PageLoader } from '@/components/ui/states';

const userNav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/my-tournaments', label: 'My Tournaments', icon: Trophy },
  { href: '/dashboard/my-matches', label: 'My Matches', icon: Swords },
  { href: '/dashboard/my-teams', label: 'My Teams', icon: Users },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/assistant', label: 'AI Assistant', icon: Sparkles },
  { href: '/dashboard/profile', label: 'Profile', icon: UserRound },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/admin/matches', label: 'Matches', icon: Gamepad2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/teams', label: 'Teams', icon: Shield },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/admin/logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/admin/assistant', label: 'AI Assistant', icon: Sparkles },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AppShell({
  children,
  section = 'user',
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  section?: 'user' | 'admin';
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isStaff } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (section === 'admin' && !isStaff) {
      router.replace('/dashboard');
    }
  }, [user, loading, isStaff, section, pathname, router]);

  if (loading || !user || (section === 'admin' && !isStaff)) {
    return (
      <>
        <Navbar />
        <div className="pt-16">
          <PageLoader label="Securing your dashboard…" />
        </div>
      </>
    );
  }

  const nav = section === 'admin' ? adminNav : userNav;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 pt-20 sm:px-6">
        {/* Sidebar — desktop */}
        <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-60 shrink-0 flex-col lg:flex">
          <div className="glass flex h-full flex-col p-3">
            <Link
              href={section === 'admin' ? '/admin' : '/dashboard'}
              className="mb-3 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {section === 'admin' ? <Shield className="h-3.5 w-3.5 text-neon-pink" /> : <Home className="h-3.5 w-3.5 text-neon-cyan" />}
                {section === 'admin' ? 'Admin Panel' : 'Player Hub'}
              </span>
            </Link>
            <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
              {nav.map((item) => {
                const active =
                  item.href === (section === 'admin' ? '/admin' : '/dashboard')
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn('nav-link', active && 'nav-link-active')}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 rounded-xl border border-neon-cyan/15 bg-neon-cyan/[0.05] p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-neon-cyan">
                <Sparkles className="h-3.5 w-3.5" /> AI POWERED
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                Ask the assistant for match times, bracket help and tournament picks.
              </p>
              <Link
                href={section === 'admin' ? '/admin/assistant' : '/dashboard/assistant'}
                className="mt-2 inline-block text-[11px] font-semibold text-neon-cyan underline"
              >
                Open assistant →
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 pb-16">
          {/* Mobile section nav (horizontal scroll) */}
          <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:hidden no-scrollbar">
            {nav.map((item) => {
              const active =
                item.href === (section === 'admin' ? '/admin' : '/dashboard')
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium',
                    active
                      ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-400',
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                {title && <h1 className="text-2xl font-bold text-white">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-neon-cyan"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
