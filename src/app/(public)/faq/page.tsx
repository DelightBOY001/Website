'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { StaticPage } from '@/components/static-page';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: 'How do I register for a tournament?',
    a: 'Browse the Tournaments page, pick an event and hit “Register”. Choose solo or team entry, fill in your in-game details, accept the rules and pay the entry fee (if any) via UPI, card or netbanking. You get a registration ID instantly after payment confirmation.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'We support UPI (GPay, PhonePe, Paytm), credit/debit cards, net banking and popular wallets through Razorpay. All payments are verified server-side — we never trust client-side payment confirmations.',
  },
  {
    q: 'What happens if my payment fails or I pay twice?',
    a: 'Failed payments can be retried immediately from your dashboard — your slot stays reserved for a short window. Duplicate payments are automatically detected via idempotency keys; any duplicate charge is refunded in full within 5-7 business days.',
  },
  {
    q: 'Can I cancel my registration and get a refund?',
    a: 'Yes, if the tournament allows cancellations and the deadline (default 24 hours before start) has not passed. Check the Refund Policy page for the full breakdown of refund windows.',
  },
  {
    q: 'How are brackets generated?',
    a: 'Brackets are generated automatically based on the tournament format: single/double elimination, round robin, Swiss or group stage + playoffs. Seeding can be automatic (by ranking), random or manual (by the organizer).',
  },
  {
    q: 'How do I report a match result?',
    a: 'Both participants (or team captains) can report scores from the match page. In case of a dispute, the organizer or a moderator makes the final call. Results update the bracket and leaderboard in real time.',
  },
  {
    q: 'How does the leaderboard ranking work?',
    a: 'Players earn points for participation and wins (3 points per win, 1 per draw, 2 participation bonus). Rankings are global, per-game and seasonal. Earnings and win rate break ties.',
  },
  {
    q: 'Can anyone organize a tournament?',
    a: 'Yes! Create an organizer account, set up your event with format, schedule, rules and prize pool, and publish. Our staff review featured tournaments. Organizers can manage registrations, brackets, scores and announcements.',
  },
  {
    q: 'Is there an AI assistant?',
    a: 'Absolutely. Ask it which tournaments to join, when your next match is, how brackets work, or for your statistics. Admins get a separate analytics assistant for revenue, registrations and platform health.',
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <StaticPage eyebrow="Knowledge base" title="Frequently Asked Questions">
      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <div
            key={i}
            className={cn(
              'overflow-hidden rounded-2xl border transition',
              open === i ? 'border-neon-cyan/30 bg-neon-cyan/[0.04]' : 'border-white/[0.07] bg-white/[0.02]',
            )}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="flex items-start gap-3">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" />
                <span className="text-sm font-semibold text-white">{f.q}</span>
              </span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', open === i && 'rotate-180')}
              />
            </button>
            {open === i && (
              <p className="animate-fade-in px-5 pb-5 pl-12 text-sm leading-relaxed text-slate-400">
                {f.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </StaticPage>
  );
}
