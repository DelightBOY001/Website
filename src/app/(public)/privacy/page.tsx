import { StaticPage, Section } from '@/components/static-page';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <StaticPage eyebrow="Legal" title="Privacy Policy">
      <p className="text-xs text-slate-500">Last updated: 1 September 2026</p>

      <Section title="1. Data We Collect">
        <p>
          Account data (name, email, username), profile data (avatar, bio, game IDs), tournament
          activity (registrations, matches, results), payment metadata (transaction IDs, amounts;
          never your full card details), and technical data (IP address, device, logs) for
          security and fraud prevention.
        </p>
      </Section>

      <Section title="2. How We Use Your Data">
        <p>
          To operate tournaments (brackets, matchmaking, results), process payments and refunds,
          send service notifications (match alerts, payment confirmations), improve the platform,
          prevent fraud and enforce our rules. Marketing emails are opt-in.
        </p>
      </Section>

      <Section title="3. Payments">
        <p>
          Payments are processed by Razorpay. We store only transaction identifiers, amounts and
          status. Card numbers, CVV and UPI PINs are never touched by our servers — they are
          handled entirely by the payment provider under PCI-DSS compliance.
        </p>
      </Section>

      <Section title="4. Sharing">
        <p>
          We share data with processors strictly needed to run the platform (payment gateway,
          email delivery, hosting). Public profile information (username, avatar, stats,
          achievements) is visible on leaderboards and tournament pages. We never sell personal
          data.
        </p>
      </Section>

      <Section title="5. Cookies">
        <p>
          We use strictly necessary cookies for session management and security (CSRF, OAuth
          state). No third-party advertising trackers are used on the platform.
        </p>
      </Section>

      <Section title="6. Security">
        <p>
          Passwords are hashed with bcrypt, sessions use HTTP-only signed cookies, all payment
          callbacks are signature-verified server-side, and administrative actions are audit
          logged. Despite our best efforts, no system is 100% secure — report vulnerabilities to
          security@nexusarena.gg.
        </p>
      </Section>

      <Section title="7. Your Rights">
        <p>
          You may access, correct or export your data, and request account deletion (subject to
          legal retention requirements for financial records). Contact privacy@nexusarena.gg to
          exercise these rights.
        </p>
      </Section>

      <Section title="8. Data Retention">
        <p>
          Account data is retained while your account is active. Payment records are retained for
          8 years as required by Indian tax law. Match history may be retained in anonymised form
          for statistical purposes.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>Data Protection Officer: privacy@nexusarena.gg</p>
      </Section>
    </StaticPage>
  );
}
