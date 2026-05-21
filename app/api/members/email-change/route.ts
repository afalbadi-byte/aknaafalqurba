import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { startVerification } from '@/lib/verification'

/**
 * Body: { email } — start changing the current member's email.
 * Sends a code to the NEW email; the old one stays active until confirmed.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await parseJson(req)
  const fe = requireFields(body, ['email'])
  if (fe) return fe

  const newEmail = String(body.email).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return jsonError('bad_email', 'بريد إلكتروني غير صالح', 400)
  }
  if (newEmail === (user.email || '').toLowerCase()) {
    return jsonError('same_email', 'هذا هو بريدك الحالي', 400)
  }

  // Make sure the new email isn't taken by another member
  const [taken] = await sql`SELECT id FROM members WHERE email = ${newEmail} AND id <> ${user.id}`
  if (taken) return jsonError('email_in_use', 'البريد مسجل بحساب آخر', 409)

  const r = await startVerification(user.id, newEmail, 'change')
  if (!r.ok) return jsonError('cooldown', `يرجى الانتظار ${r.cooldown_seconds}ث قبل طلب رمز جديد`, 429, { cooldown_seconds: r.cooldown_seconds })
  if (!r.email_sent) return jsonError('smtp_error', 'فشل إرسال رمز التأكيد — تحقق من إعدادات SMTP في Vercel', 500)
  return jsonOK({ message: 'تم إرسال رمز التأكيد للبريد الجديد', pending_email: newEmail })
}
