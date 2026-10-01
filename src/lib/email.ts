import { env } from './env';

/**
 * Transactional email service.
 *
 * Uses the Resend HTTP API when EMAIL_API_KEY is set; otherwise emails are
 * logged to the server console (dev mode) so flows remain testable.
 */
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const from = env.EMAIL_FROM;
  const apiKey = env.EMAIL_API_KEY;

  if (!apiKey) {
    console.log(
      `[email:dev] To: ${payload.to} | Subject: ${payload.subject}\n${
        payload.text ?? payload.html.replace(/<[^>]+>/g, ' ').slice(0, 400)
      }`,
    );
    return true;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text ?? payload.html.replace(/<[^>]+>/g, ' '),
      }),
    });
    if (!res.ok) {
      console.error('[email] provider error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] send failed:', err);
    return false;
  }
}

const brand = (title: string, body: string) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0a0c1a;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0c1a;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#11142b;border:1px solid #1a1f42;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(120deg,#00f0ff 0%,#8b5cf6 100%);">
              <span style="font-size:20px;font-weight:800;letter-spacing:3px;color:#05060f;">NEXUS ARENA</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#e2e8f0;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">${title}</h1>
              <div style="font-size:15px;line-height:1.7;color:#b6c2e2;">${body}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1a1f42;font-size:12px;color:#64748b;">
              © ${new Date().getFullYear()} NEXUS ARENA · Compete. Conquer. Dominate.<br/>
              If you didn't request this email, you can safely ignore it.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

export const emailTemplates = {
  verifyEmail(name: string, url: string) {
    return {
      subject: 'Verify your NEXUS ARENA account',
      html: brand(
        `Welcome, ${name}!`,
        `Confirm your email address to activate your player profile and start competing.
         <br/><br/>
         <a href="${url}" style="display:inline-block;background:#00f0ff;color:#05060f;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;letter-spacing:1px;">VERIFY EMAIL</a>
         <br/><br/>Or open this link: <a href="${url}" style="color:#00f0ff;">${url}</a>`,
      ),
    };
  },
  resetPassword(name: string, url: string) {
    return {
      subject: 'Reset your NEXUS ARENA password',
      html: brand(
        `Password reset requested`,
        `Hi ${name}, we received a request to reset your password. This link expires in 60 minutes.
         <br/><br/>
         <a href="${url}" style="display:inline-block;background:#8b5cf6;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;letter-spacing:1px;">RESET PASSWORD</a>
         <br/><br/>Or open this link: <a href="${url}" style="color:#00f0ff;">${url}</a>
         <br/><br/>If this wasn't you, secure your account immediately.`,
      ),
    };
  },
  paymentSuccess(name: string, tournament: string, amount: string, txnId: string) {
    return {
      subject: `Payment confirmed — ${tournament}`,
      html: brand(
        `You're registered!`,
        `Hi ${name}, your payment of <strong style="color:#22c55e;">${amount}</strong> for <strong>${tournament}</strong> was successful.
         <br/><br/>Transaction ID: <code style="color:#00f0ff;">${txnId}</code>
         <br/>Your slot is locked in. GLHF!`,
      ),
    };
  },
  matchAssigned(name: string, opponent: string, when: string, tournament: string) {
    return {
      subject: `Match assigned — ${tournament}`,
      html: brand(
        `Your next match`,
        `Hi ${name}, you are scheduled against <strong>${opponent}</strong> in <strong>${tournament}</strong>.
         <br/>Scheduled: <strong>${when}</strong>
         <br/><br/>Check your dashboard for lobby details and live bracket updates.`,
      ),
    };
  },
  generic(title: string, body: string) {
    return { subject: title, html: brand(title, body) };
  },
};
