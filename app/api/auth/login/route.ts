import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { verifyPassword, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { startVerification } from '@/lib/verification'
import { log, getIP } from '@/lib/log'

/** Mask email for display: ahmed@example.com → a***@example.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  return `${local[0]}***@${domain}`
}

export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  const err  = requireFields(body, ['identifier', 'password'])
  if (err) return err

  const ident = String(body.identifier).trim()
  const ip    = getIP(req)

  // Lookup: national_id first, then phone/email as fallback
  const rows = await sql`
    SELECT * FROM members
    WHERE national_id = ${ident}
       OR phone       = ${ident}
       OR email       = ${ident}
    LIMIT 1
  `
  const m = rows[0]

  if (!m || !(await verifyPassword(body.password, m.password_hash))) {
    void log(m?.id ?? null, 'auth.login_failed', { ip, member_name: m?.full_name ?? null, details: { identifier: ident } })
    return jsonError('bad_credentials', 'بيانات الدخول غير صحيحة', 401)
  }

  if (m.status === 'pending')   return jsonError('account_pending',   'حسابك بانتظار تفعيل لجنة الصندوق', 403)
  if (m.status === 'suspended') return jsonError('account_suspended', 'الحساب موقوف. تواصل مع الإدارة',  403)

  // ── OTP via email ──────────────────────────────────────────────────────────
  if (!m.email) {
    return jsonError(
      'no_email',
      'لا يوجد بريد إلكتروني مرتبط بحسابك. يرجى التواصل مع إدارة الصندوق لإضافته.',
      403,
    )
  }

  try {
    const otp = await startVerification(m.id, m.email, 'login_otp')
    if (!otp.ok && otp.cooldown_seconds) {
      return jsonError('otp_cooldown', `انتظر ${otp.cooldown_seconds} ثانية قبل طلب رمز جديد`, 429)
    }
  } catch (e: any) {
    console.error('[login] OTP error:', e.message)
    return jsonError('otp_failed', 'تعذّر إرسال رمز التحقق، حاول مرة أخرى', 500)
  }

  void log(m.id, 'auth.login_otp_sent', { ip, member_name: m.full_name })

  return jsonOK({
    otp_pending: true,
    member_id:   m.id,
    email_hint:  maskEmail(m.email),
  })
}
