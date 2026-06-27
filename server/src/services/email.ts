import nodemailer from 'nodemailer';

const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '',
  port: SMTP_PORT,
  // Port 465 is implicit TLS (SMTPS); 587/25 use STARTTLS. Allow an explicit
  // override via SMTP_SECURE for providers that differ.
  secure: process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  // Bounded so the admin health check's verify() can't hang on a bad host.
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 8000,
});

const isConfigured =
  !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

export function isEmailConfigured(): boolean {
  return isConfigured;
}

/**
 * Verifies the SMTP connection/credentials without sending mail. Returns a
 * structured result for the admin diagnostics. Never throws.
 */
export async function verifyEmailConfig(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!isConfigured) return { ok: false, configured: false, error: 'SMTP_HOST / SMTP_USER / SMTP_PASS are not all set' };
  try {
    await transporter.verify();
    return { ok: true, configured: true };
  } catch (err) {
    return { ok: false, configured: true, error: err instanceof Error ? err.message : String(err) };
  }
}

function frontendUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
}

// Publicly reachable logo for the email header. Email clients can't load
// localhost or SVG, so this defaults to the production PNG served from the
// marketing site's /public folder. Override with EMAIL_LOGO_URL if needed.
function logoUrl(): string {
  return process.env.EMAIL_LOGO_URL || 'https://iinwentory.com/email-logo.png';
}

// Shared branded shell so every email looks consistent. `cta` renders a button.
function renderLayout(opts: {
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footnote?: string;
}): string {
  const { heading, bodyHtml, cta, footnote } = opts;
  return `
    <div style="font-family: Inter, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
      <img src="${logoUrl()}" alt="iinwentory" width="44" height="42" style="display:block; border:0; outline:none; text-decoration:none; margin-bottom: 24px;" />
      <h2 style="color: #294EA7; margin-bottom: 16px;">${heading}</h2>
      <div style="color: #475569; line-height: 1.6; font-size: 15px;">${bodyHtml}</div>
      ${cta
        ? `<a href="${cta.url}" style="display: inline-block; background: #294EA7; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">${cta.label}</a>`
        : ''}
      ${footnote ? `<p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">${footnote}</p>` : ''}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #cbd5e1; font-size: 12px;">iinwentory — Inventory management, simplified.</p>
    </div>
  `;
}

/**
 * Core sender. Best-effort: never throws into the request path. Returns true if
 * the message was handed to the transport, false if SMTP is unconfigured or the
 * send failed (both are logged). When unconfigured, the content is logged so
 * local dev still works without a mail server.
 */
async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isConfigured) {
    console.log('──────────────────────────────────────────────');
    console.log('📧 SMTP not configured — email not sent:');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log('──────────────────────────────────────────────');
    return false;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@iinwentory.com',
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error(`📧 Failed to send "${subject}" to ${to}:`, err);
    return false;
  }
}

// ── Transactional emails ──────────────────────────────────────────────────────

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${frontendUrl()}/reset-password?token=${resetToken}`;
  return sendMail(email, 'Reset your iinwentory password', renderLayout({
    heading: 'Reset your password',
    bodyHtml: 'We received a request to reset your iinwentory password. Click the button below to choose a new password.',
    cta: { label: 'Reset Password', url: resetUrl },
    footnote: "If you didn't request this, you can safely ignore this email. This link expires in 1 hour.",
  }));
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const safeName = name?.trim() || 'there';
  return sendMail(email, 'Welcome to iinwentory', renderLayout({
    heading: `Welcome, ${safeName}!`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Your iinwentory account is ready. Here's how to get going:</p>
      <ul style="margin:0 0 12px; padding-left:18px;">
        <li>Create folders and add your first items</li>
        <li>Invite your team and assign roles</li>
        <li>Track stock, pick lists and low-stock alerts</li>
      </ul>`,
    cta: { label: 'Open iinwentory', url: `${frontendUrl()}/dashboard` },
    footnote: 'Glad to have you on board.',
  }));
}

export async function sendPasswordChangedEmail(email: string): Promise<boolean> {
  return sendMail(email, 'Your iinwentory password was changed', renderLayout({
    heading: 'Password changed',
    bodyHtml: 'This is a confirmation that the password for your iinwentory account was just changed.',
    footnote: "If this wasn't you, reset your password immediately and contact support.",
    cta: { label: 'Sign in', url: `${frontendUrl()}/login` },
  }));
}

export async function sendTeamInviteEmail(
  email: string,
  opts: { inviterName: string; orgName: string; code: string },
): Promise<boolean> {
  const { inviterName, orgName, code } = opts;
  const joinUrl = `${frontendUrl()}/register?invite=${encodeURIComponent(code)}`;
  return sendMail(email, `You've been invited to join ${orgName} on iinwentory`, renderLayout({
    heading: `Join ${orgName}`,
    bodyHtml: `
      <p style="margin:0 0 12px;"><b>${inviterName}</b> invited you to join <b>${orgName}</b> on iinwentory.</p>
      <p style="margin:0 0 8px;">Use this invite code when you sign up or from the Team page:</p>
      <p style="font-size:22px; font-weight:700; letter-spacing:2px; font-family:monospace; color:#294EA7; margin:0 0 4px;">${code}</p>`,
    cta: { label: 'Accept invite', url: joinUrl },
    footnote: 'This invite expires in 7 days.',
  }));
}

export async function sendLowStockEmail(
  email: string,
  opts: { orgName: string; items: { name: string; quantity: number; minQuantity: number }[] },
): Promise<boolean> {
  const { orgName, items } = opts;
  const rows = items.map(i => `
    <tr>
      <td style="padding:6px 10px; border-top:1px solid #e2e8f0;">${i.name}</td>
      <td style="padding:6px 10px; border-top:1px solid #e2e8f0; color:#dc2626; font-weight:600;">${i.quantity}</td>
      <td style="padding:6px 10px; border-top:1px solid #e2e8f0; color:#64748b;">${i.minQuantity}</td>
    </tr>`).join('');
  return sendMail(email, `Low stock alert — ${orgName}`, renderLayout({
    heading: 'Low stock alert',
    bodyHtml: `
      <p style="margin:0 0 12px;">${items.length} item${items.length === 1 ? '' : 's'} in <b>${orgName}</b> ${items.length === 1 ? 'is' : 'are'} at or below the minimum level:</p>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <thead><tr style="text-align:left; color:#64748b; font-size:12px;">
          <th style="padding:6px 10px;">Item</th><th style="padding:6px 10px;">In stock</th><th style="padding:6px 10px;">Min</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
    cta: { label: 'Review inventory', url: `${frontendUrl()}/items` },
  }));
}
