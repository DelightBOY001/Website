import { StaticPage, Section } from '@/components/static-page';

export const metadata = { title: 'Terms & Conditions' };

export default function TermsPage() {
  return (
    <StaticPage eyebrow="Legal" title="Terms & Conditions">
      <p className="text-xs text-slate-500">Last updated: 1 September 2026</p>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using NEXUS ARENA (the “Platform”), you agree to be bound by these
          Terms & Conditions and all policies referenced herein. If you do not agree, you may
          not use the Platform.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 13 years old to create an account. Users under 18 must have
          parental consent to participate in paid tournaments. One account per person —
          multi-accounting results in permanent bans.
        </p>
      </Section>

      <Section title="3. Accounts & Security">
        <p>
          You are responsible for maintaining the confidentiality of your credentials. Notify
          support immediately of any unauthorised use. We may suspend accounts that violate
          these terms, including cheaters, match-fixers and abusive players.
        </p>
      </Section>

      <Section title="4. Tournaments & Conduct">
        <p>
          Participants must follow each tournament&apos;s specific rules and the general code of
          conduct: no cheats/exploits, no toxic behaviour, no account sharing, and no collusion.
          Organizers and moderators may disqualify players for violations. Organizer decisions
          on match disputes are final, subject to platform moderation review.
        </p>
      </Section>

      <Section title="5. Entry Fees & Prizes">
        <p>
          Entry fees are collected securely via Razorpay. Prize distribution follows the
          published prize structure of each tournament and is typically completed within 7
          business days of tournament completion. Platform fees, where applicable, are disclosed
          before payment.
        </p>
      </Section>

      <Section title="6. Refunds">
        <p>
          Refund eligibility is governed by our Refund Policy, which forms part of these Terms.
        </p>
      </Section>

      <Section title="7. Prohibited Activities">
        <p>
          Cheating, exploitation of bugs, harassment, payment fraud, chargeback abuse and any
          attempt to manipulate match results will result in bans and forfeiture of prizes.
          We cooperate with payment providers and law enforcement where necessary.
        </p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>
          The Platform is provided “as is”. To the maximum extent permitted by law, NEXUS
          ARENA is not liable for indirect, incidental or consequential damages, including lost
          winnings arising from third-party service outages, game server issues or force majeure
          events.
        </p>
      </Section>

      <Section title="9. Changes to Terms">
        <p>
          We may update these Terms from time to time. Material changes will be notified via
          email or in-app announcements. Continued use after changes constitutes acceptance.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>Questions about these Terms: legal@nexusarena.gg</p>
      </Section>
    </StaticPage>
  );
}
