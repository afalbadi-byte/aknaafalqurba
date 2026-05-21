import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { startVerification } from '@/lib/verification'

/** Body: { member_id } — resends the registration verification code. */
export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  const fe = requireFields(body, ['member_id'])
  if (fe) return fe

  const member_id = Number(body.member_id)
  const [m] = await sql<{ email: string | null; email_verified: boolean }[]>`
    SELECT email, email_verified FROM members WHERE id = ${member_id}
  `
  if (!m)           return jsonError('not_found', 'عضو غير موجود', 404)
  if (!m.email)     return jsonError('no_email',  'لا يوجد بريد مسجل', 400)
  if (m.email_verified) return jsonError('already_verified', 'البريد مؤكد بالفعل', 400)

  const r = await startVerification(member_id, m.email, 'register')
  if (!r.ok) return jsonError('cooldown', `يرجى الانتظار ${r.cooldown_seconds}ث قبل طلب رمز جديد`, 429, { cooldown_seconds: r.cooldown_seconds })
  if (!r.email_sent) return jsonError('smtp_error', 'فشل إرسال رمز التأكيد — تحقق من إعدادات SMTP في Vercel', 500)
  return jsonOK({ message: 'تم إرسال رمز جديد' })
}
