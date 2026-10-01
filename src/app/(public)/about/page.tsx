import { Trophy, Shield, Zap, Users, Target, Sparkles } from 'lucide-react';
import { StaticPage, Section } from '@/components/static-page';

export const metadata = { title: 'About Us' };

export default function AboutPage() {
  return (
    <StaticPage eyebrow="Who we are" title="About NEXUS ARENA">
      <p className="text-base leading-relaxed text-slate-300">
        NEXUS ARENA is a competitive gaming platform built for one purpose: turning every
        player — from weekend warrior to professional — into a champion with a fair, transparent
        and thrilling tournament experience.
      </p>

      <Section title="Our Mission">
        <p>
          Esports in India is booming, but the infrastructure behind it often isn&apos;t. We
          combine professional bracket systems, secure payments and real-time match tracking so
          organizers can run flawless events and players can focus on what matters — winning.
        </p>
      </Section>

      <Section title="What Makes Us Different">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Trophy, title: 'Professional Brackets', body: 'Single/double elimination, Swiss, round-robin and group play — generated automatically.' },
            { icon: Shield, title: 'Secure Payments', body: 'Razorpay-powered UPI, cards and netbanking with server-side verification and refunds.' },
            { icon: Zap, title: 'Real-time Everything', body: 'Live bracket updates, match alerts and notifications — no refreshing needed.' },
            { icon: Sparkles, title: 'AI Assistance', body: 'A tournament assistant that knows your schedule, stats and the best events to join.' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <f.icon className="h-5 w-5 text-neon-cyan" />
              <p className="mt-3 font-semibold text-white">{f.title}</p>
              <p className="mt-1.5 text-sm text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="By The Numbers">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Users, value: '10,000+', label: 'Players' },
            { icon: Trophy, value: '500+', label: 'Tournaments' },
            { icon: Target, value: '₹25L+', label: 'Prizes paid' },
            { icon: Zap, value: '99.9%', label: 'Uptime' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center">
              <s.icon className="mx-auto h-5 w-5 text-neon-cyan/70" />
              <p className="mt-2 font-display text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>
    </StaticPage>
  );
}
