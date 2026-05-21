import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { checkCode } from '@/lib/verification'

/** Body: { member_id, code } — used right after /register (no session yet). */
export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  const fe = requireFields(body, ['member_id', 'code'])
  if (fe) return fe

  const member_id = Number(body.member_id)
  const result = await checkCode(member_id, String(body.code), 'register')
  if (!result.ok) return jsonError('bad_code', result.reason || 'الرمز غير صحيح', 400)

  // Mark this email as verified on the member record
  await sql`
    UPDATE members
    SET email_verified = TRUE, updated_at = NOW()
    WHERE id = ${member_id} AND email = ${result.email!}
  `
  return jsonOK({ message: 'تم تأكيد البريد الإلكتروني بنجاح' })
}
