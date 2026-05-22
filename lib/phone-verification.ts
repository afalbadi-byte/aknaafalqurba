import bcrypt from 'bcryptjs'
import { sql } from './db'
import { sendSms, hasSmsProvider } from './sms'
import { sendWhatsAppOtp, hasWhatsAppProvider } from './whatsapp'
import { sendEmail } from './email'

const CODE_LIFETIME_MIN = 10
const MAX_ATTEMPTS      = 5
const RESEND_COOLDOWN_S = 60

function gen6(): string {
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')
}

/**
 * Generate a 6-digit OTP, store its hash, then deliver it:
 *   • via SMS  — when an SMS provider (Msegat / Unifonic) is configured
 *   • via email — fallback when no SMS provider exists (uses existing email infra)
 *
 * `fallbackEmail` must be supplied for the email-fallback path to work.
 *
 * Returns { ok, cooldown_seconds?, via: 'sms' | 'email' }
 */
export async function startPhoneVerification(
  member_id: number,
  phone: string,
  purpose: 'verify' | 'change' = 'verify',
  fallbackEmail?: string,
): Promise<{ ok: boolean; cooldown_seconds?: number; via?: 'sms' | 'email' }> {
  // Rate-limit: one message per RESEND_COOLDOWN_S seconds
  const [last] = await sql<{ created_at: string }[]>`
    SELECT created_at FROM phone_verifications
    WHERE member_id = ${member_id} AND phone = ${phone} AND purpose = ${purpose}
    ORDER BY created_at DESC LIMIT 1
  `
  if (last) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000
    if (elapsed < RESEND_COOLDOWN_S)
      return { ok: false, cooldown_seconds: Math.ceil(RESEND_COOLDOWN_S - elapsed) }
  }

  // Invalidate any prior unused codes
  await sql`
    UPDATE phone_verifications
    SET used_at = NOW()
    WHERE member_id = ${member_id} AND phone = ${phone}
      AND purpose = ${purpose} AND used_at IS NULL
  `

  const code    = gen6()
  const hash    = await bcrypt.hash(code, 8)
  const expires = new Date(Date.now() + CODE_LIFETIME_MIN * 60_000)

  await sql`
    INSERT INTO phone_verifications (member_id, phone, code_hash, purpose, expires_at)
    VALUES (${member_id}, ${phone}, ${hash}, ${purpose}, ${expires})
  `

  // ── Delivery — priority: SMS → WhatsApp → Email ────────────────────────
  // 1. Paid SMS provider (Msegat / Unifonic)
  if (hasSmsProvider()) {
    const msg = `رمز التحقق لصندوق أكناف القربى: ${code}\nصالح لمدة ${CODE_LIFETIME_MIN} دقائق. لا تشاركه مع أحد.`
    await sendSms(phone, msg)
    return { ok: true, via: 'sms' }
  }

  // 2. WhatsApp Cloud API (Meta) — free, recommended
  if (hasWhatsAppProvider()) {
    const sent = await sendWhatsAppOtp(phone, code)
    if (sent) return { ok: true, via: 'whatsapp' }
  }

  // 3. Email fallback — not a real phone verify, but better than nothing
  if (fallbackEmail) {
    const body = `
      <p>لتفعيل رقم جوالك <strong dir="ltr">${phone}</strong> في صندوق أكناف القربى، استخدم الرمز التالي:</p>
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;background:#f1f4f8;border:2px dashed #b8934b;
                    border-radius:12px;padding:18px 32px;font-size:32px;font-weight:800;
                    letter-spacing:8px;color:#0b2135;font-family:monospace;">
          ${code}
        </div>
      </div>
      <p style="font-size:13px;color:#5d7a99;">
        الرمز صالح لمدة ${CODE_LIFETIME_MIN} دقائق فقط. لا تشارك هذا الرمز مع أحد.
      </p>
    `
    await sendEmail({
      to: fallbackEmail,
      subject: 'رمز تفعيل رقم الجوال — صندوق أكناف القربى',
      body,
      preheader: `رمز تفعيل جوالك: ${code}`,
    })
    return { ok: true, via: 'email' }
  }

  // Dev / no config — print to server console
  console.log(`\n📱 [PHONE-OTP] ${phone} → ${code}\n`)
  return { ok: true, via: 'sms' }
}

/**
 * Validate a code.
 * On success marks the row as used.
 * On failure increments the attempt counter.
 */
export async function checkPhoneCode(
  member_id: number,
  code: string,
  purpose: 'verify' | 'change' = 'verify',
): Promise<{ ok: boolean; phone?: string; reason?: string }> {
  const clean = code.replace(/\D/g, '')
  if (clean.length !== 6) return { ok: false, reason: 'الرمز يجب أن يكون ٦ أرقام' }

  const [row] = await sql<any[]>`
    SELECT id, phone, code_hash, attempts, expires_at
    FROM phone_verifications
    WHERE member_id = ${member_id} AND purpose = ${purpose} AND used_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `
  if (!row)
    return { ok: false, reason: 'لا يوجد رمز نشط — اطلب رمزاً جديداً' }
  if (new Date(row.expires_at).getTime() < Date.now())
    return { ok: false, reason: 'انتهت صلاحية الرمز — اطلب رمزاً جديداً' }
  if (row.attempts >= MAX_ATTEMPTS)
    return { ok: false, reason: 'تجاوزت عدد المحاولات — اطلب رمزاً جديداً' }

  const valid = await bcrypt.compare(clean, row.code_hash)
  if (!valid) {
    await sql`UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = ${row.id}`
    return { ok: false, reason: 'الرمز غير صحيح' }
  }

  await sql`UPDATE phone_verifications SET used_at = NOW() WHERE id = ${row.id}`
  return { ok: true, phone: row.phone }
}
