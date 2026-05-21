// Email sending via SMTP (Hostinger / any SMTP provider).
// Reads credentials from env. If SMTP_HOST is unset, emails silently no-op
// so the platform keeps working in dev without SMTP configured.

import nodemailer, { type Transporter } from 'nodemailer'

let cached: Transporter | null = null

function transporter(): Transporter | null {
  if (cached) return cached
  const host = process.env.SMTP_HOST
  if (!host) return null
  const port   = Number(process.env.SMTP_PORT || 465)
  // port 465 = SSL (secure:true), port 587 = STARTTLS (secure:false)
  const secure = port === 465 ? true : process.env.SMTP_SECURE !== 'false'
  cached = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },  // avoid self-signed cert issues
  })
  return cached
}

// Use plain ASCII display name to avoid SMTP header encoding issues
const FROM = process.env.SMTP_FROM
  || (process.env.SMTP_USER ? `Akhnaf AlQurba <${process.env.SMTP_USER}>` : null)

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://aknafalqurba.com'

export type EmailOptions = {
  to: string
  subject: string
  /** Single message line (plain text or simple HTML allowed) */
  body: string
  /** Optional CTA button */
  cta?: { label: string; url: string }
  /** Optional preheader (preview text shown by mail clients) */
  preheader?: string
}

export async function sendEmail({ to, subject, body, cta, preheader }: EmailOptions): Promise<boolean> {
  const t = transporter()
  if (!t || !FROM) return false   // SMTP not configured — no-op

  const html = renderTemplate({ subject, body, cta, preheader })
  const text = stripHtml(body) + (cta ? `\n\n${cta.label}: ${cta.url}` : '')

  try {
    await t.sendMail({ from: FROM, to, subject, html, text })
    return true
  } catch (e) {
    console.error('[email] sendMail failed:', (e as Error).message)
    console.error('[email] config → host:', process.env.SMTP_HOST, 'port:', process.env.SMTP_PORT, 'user:', process.env.SMTP_USER, 'from:', FROM)
    return false
  }
}

// ----------------- HTML template (RTL, brand colors) -----------------
function renderTemplate({
  subject, body, cta, preheader,
}: { subject: string; body: string; cta?: { label: string; url: string }; preheader?: string }) {
  const ctaHtml = cta ? `
    <tr>
      <td align="center" style="padding: 8px 32px 32px;">
        <a href="${esc(cta.url)}"
           style="display:inline-block;padding:14px 32px;background:#b8934b;color:#ffffff;
                  font-weight:700;text-decoration:none;border-radius:8px;font-size:15px;">
          ${esc(cta.label)}
        </a>
      </td>
    </tr>` : ''

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f4f8;font-family:'Cairo','Tajawal','Segoe UI',Tahoma,Arial,sans-serif;color:#0b2135;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f1f4f8;">${esc(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f4f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 16px rgba(11,33,53,0.08);max-width:600px;">

        <!-- Header band -->
        <tr>
          <td style="background:#0b2135;padding:24px 32px;" align="center">
            <img src="${SITE}/brand/logo-white.png" alt="صندوق أكناف القربى"
                 width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;">
          </td>
        </tr>

        <!-- Gold separator -->
        <tr><td style="background:#b8934b;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:22px;color:#0b2135;font-weight:800;text-align:right;">
              ${esc(subject)}
            </h1>
            <div style="font-size:15px;line-height:1.8;color:#1f3450;text-align:right;">
              ${body}
            </div>
          </td>
        </tr>

        ${ctaHtml}

        <!-- Footer -->
        <tr><td style="background:#b8934b;height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="background:#0b2135;padding:20px 32px;color:#dde4ec;font-size:12px;text-align:center;">
            <div style="margin-bottom:6px;">«وَآتِ ذَا الْقُرْبَىٰ حَقَّهُ»</div>
            <div style="opacity:.7;">
              صندوق أكناف القربى — عائلة البادي<br>
              رقم الترخيص 1200775200 · ${esc(SITE.replace(/^https?:\/\//, ''))}
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function esc(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}
