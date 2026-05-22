import bcrypt from 'bcryptjs'
import { sql } from './db'
import { sendSms } from './sms'

const CODE_LIFETIME_MIN = 10
const MAX_ATTEMPTS      = 5
const RESEND_COOLDOWN_S = 60

function gen6(): string {
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')
}

/**
 * Generate a 6-digit OTP, store its hash in phone_verifications, and
 * send it via SMS to the given phone number.
 *
 * Returns { ok, cooldown_seconds? }
 */
export async function startPhoneVerification(
  member_id: number,
  phone: string,
  purpose: 'verify' | 'change' = 'verify',
): Promise<{ ok: boolean; cooldown_seconds?: number }> {
  // Rate-limit: one SMS per RESEND_COOLDOWN_S seconds
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

  const message =
    `رمز التحقق لصندوق أكناف القربى: ${code}\n` +
    `صالح لمدة ${CODE_LIFETIME_MIN} دقائق. لا تشاركه مع أحد.`
  await sendSms(phone, message)

  return { ok: true }
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
