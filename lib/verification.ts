import bcrypt from 'bcryptjs'
import { sql } from './db'
import { sendEmail } from './email'

const CODE_LIFETIME_MIN = 10
const MAX_ATTEMPTS      = 5
const RESEND_COOLDOWN_S = 60

function gen6(): string {
  // 6-digit code, leading zeros allowed
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')
}

/**
 * Create a verification code and email it to the address.
 * `purpose='register'` for first-time signups, `purpose='change'` when changing an email.
 *
 * Returns { ok, cooldown_seconds? } — `cooldown_seconds` set if a previous code
 * was issued too recently.
 */
export async function startVerification(
  member_id: number,
  email: string,
  purpose: 'register' | 'change' | 'login_otp' = 'register',
): Promise<{ ok: boolean; email_sent?: boolean; cooldown_seconds?: number }> {
  // Cool-down: don't allow spamming
  const [last] = await sql<{ created_at: string }[]>`
    SELECT created_at FROM email_verifications
    WHERE member_id = ${member_id} AND email = ${email} AND purpose = ${purpose}
    ORDER BY created_at DESC LIMIT 1
  `
  if (last) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000
    if (elapsed < RESEND_COOLDOWN_S) {
      return { ok: false, cooldown_seconds: Math.ceil(RESEND_COOLDOWN_S - elapsed) }
    }
  }

  // Invalidate older unused codes for this member+email+purpose
  await sql`
    UPDATE email_verifications
    SET used_at = NOW()
    WHERE member_id = ${member_id} AND email = ${email} AND purpose = ${purpose}
      AND used_at IS NULL
  `

  const code = gen6()
  const hash = await bcrypt.hash(code, 8)
  const expires = new Date(Date.now() + CODE_LIFETIME_MIN * 60_000)
  await sql`
    INSERT INTO email_verifications (member_id, email, code_hash, purpose, expires_at)
    VALUES (${member_id}, ${email}, ${hash}, ${purpose}, ${expires})
  `

  const subject =
    purpose === 'register'  ? 'رمز تأكيد البريد - صندوق أكناف القربى' :
    purpose === 'login_otp' ? 'رمز تأكيد الدخول - صندوق أكناف القربى' :
                              'رمز تأكيد البريد الجديد'

  const intro =
    purpose === 'register'  ? 'أهلاً بك في صندوق أكناف القربى. لإكمال طلب الانضمام، أكّد بريدك الإلكتروني باستخدام الرمز التالي:' :
    purpose === 'login_otp' ? 'تم طلب تسجيل الدخول لحسابك في صندوق أكناف القربى. استخدم الرمز التالي لإتمام الدخول:' :
                              'لتأكيد بريدك الإلكتروني الجديد، استخدم الرمز التالي:'

  const html = `
    <p>${intro}</p>
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background:#f1f4f8;border:2px dashed #b8934b;
                  border-radius:12px;padding:18px 32px;font-size:32px;font-weight:800;
                  letter-spacing:8px;color:#0b2135;font-family:monospace;">
        ${code}
      </div>
    </div>
    <p style="font-size:13px;color:#5d7a99;">
      الرمز صالح لمدة ${CODE_LIFETIME_MIN} دقيقة فقط. لا تشارك هذا الرمز مع أحد.
    </p>
    <p style="font-size:13px;color:#5d7a99;">
      إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.
    </p>
  `

  const email_sent = await sendEmail({ to: email, subject, body: html, preheader: `رمز التأكيد: ${code}` })
  return { ok: true, email_sent }
}

/**
 * Verify a 6-digit code. On success returns the row (with `email`) and marks
 * the code as used. On failure increments attempts.
 */
export async function checkCode(
  member_id: number, code: string, purpose: 'register' | 'change' | 'login_otp' = 'register',
): Promise<{ ok: boolean; email?: string; reason?: string }> {
  const clean = code.replace(/\D/g, '')
  if (clean.length !== 6) return { ok: false, reason: 'الرمز يجب أن يكون ٦ أرقام' }

  const [row] = await sql<any[]>`
    SELECT id, email, code_hash, attempts, expires_at
    FROM email_verifications
    WHERE member_id = ${member_id} AND purpose = ${purpose} AND used_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `
  if (!row) return { ok: false, reason: 'لا يوجد رمز نشط — اطلب رمزاً جديداً' }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'انتهت صلاحية الرمز — اطلب رمزاً جديداً' }
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'تجاوزت عدد المحاولات — اطلب رمزاً جديداً' }
  }

  const valid = await bcrypt.compare(clean, row.code_hash)
  if (!valid) {
    await sql`UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ${row.id}`
    return { ok: false, reason: 'الرمز غير صحيح' }
  }

  await sql`UPDATE email_verifications SET used_at = NOW() WHERE id = ${row.id}`
  return { ok: true, email: row.email }
}
