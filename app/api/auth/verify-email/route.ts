import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { checkCode } from '@/lib/verification'
import { checkAndActivate } from '@/lib/activation'

/** Body: { member_id, code } — used right after /register (no session yet). */
export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  const fe = requireFields(body, ['member_id', 'code'])
  if (fe) return fe

  const member_id = Number(body.member_id)
  const result = await checkCode(member_id, String(body.code), 'register')
  if (!result.ok) return jsonError('bad_code', result.reason || 'الرمز غير صحيح', 400)

  // Mark email as verified
  await sql`
    UPDATE members
    SET email_verified = TRUE
    WHERE id = ${member_id} AND email = ${result.email!}
  `

  // Check if both verifications done → activate automatically
  const activated = await checkAndActivate(member_id)

  return jsonOK({
    activated,
    message: activated
      ? 'تم تأكيد البريد وتفعيل حسابك! يمكنك الدخول الآن.'
      : 'تم تأكيد البريد الإلكتروني. أكمل رفع صورة هويتك لتفعيل الحساب.',
  })
}
