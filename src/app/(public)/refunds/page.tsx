import { StaticPage, Section } from '@/components/static-page';

export const metadata = { title: 'Refund Policy' };

export default function RefundsPage() {
  return (
    <StaticPage eyebrow="Legal" title="Refund Policy">
      <p className="text-xs text-slate-500">Last updated: 1 September 2026</p>

      <Section title="1. Player-Initiated Cancellations">
        <p>
          If a tournament permits cancellations, you may cancel your registration up to{' '}
          <strong className="text-slate-300">24 hours before the scheduled start</strong> (or the
          window configured by the organizer) and receive a full refund of the entry fee to your
          original payment method.
        </p>
      </Section>

      <Section title="2. Tournament Cancelled by Organizer">
        <p>
          If a tournament is cancelled before it begins, all entry fees are refunded in full,
          automatically. If a tournament is abandoned mid-way after you have played matches, a
          pro-rated or full refund may be issued at the platform&apos;s discretion depending on
          the stage reached.
        </p>
      </Section>

      <Section title="3. Duplicate Payments">
        <p>
          Duplicate charges (the same entry fee paid more than once for the same tournament) are
          detected automatically and refunded in full within 5-7 business days — no action needed
          from your side. You will receive an email confirmation.
        </p>
      </Section>

      <Section title="4. Failed & Pending Payments">
        <p>
          Failed payments are never captured — any amount debited but not confirmed is
          automatically reversed by your bank/payment provider, typically within 3-5 business
          days. Contact support if a debit persists beyond that window.
        </p>
      </Section>

      <Section title="5. Disqualifications">
        <p>
          Entry fees are non-refundable for players disqualified for cheating, toxic behaviour,
          rule violations or no-shows after the tournament has started.
        </p>
      </Section>

      <Section title="6. Refund Timelines">
        <p>
          Approved refunds are initiated within 48 hours and typically reflect in your account
          within 5-7 business days depending on your bank or card issuer. UPI refunds are often
          faster (24-48 hours).
        </p>
      </Section>

      <Section title="7. How to Request">
        <p>
          Cancel directly from your dashboard (My Tournaments → Cancel), or email
          refunds@nexusarena.gg with your Registration ID and Payment Transaction ID. Include the
          reason — it helps us process faster.
        </p>
      </Section>

      <Section title="8. Non-Refundable Items">
        <p>
          Platform subscription fees (if any), cosmetic purchases and completed tournament
          registrations that have progressed past the start time are non-refundable.
        </p>
      </Section>
    </StaticPage>
  );
}
