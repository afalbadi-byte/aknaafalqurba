import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { checkCode } from '@/lib/verification'

/** Body: { code } — confirms a pending email change. */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await parseJson(req)
  const fe = requireFields(body, ['code'])
  if (fe) return fe

  const result = await checkCode(user.id, String(body.code), 'change')
  if (!result.ok) return jsonError('bad_code', result.reason || 'الرمز غير صحيح', 400)

  // Make sure the email is still free
  const [taken] = await sql`SELECT id FROM members WHERE email = ${result.email!} AND id <> ${user.id}`
  if (taken) return jsonError('email_in_use', 'البريد مسجل بحساب آخر بعد بدء التغيير', 409)

  await sql`
    UPDATE members
    SET email = ${result.email!}, email_verified = TRUE, updated_at = NOW()
    WHERE id = ${user.id}
  `
  return jsonOK({ message: 'تم تحديث بريدك الإلكتروني', email: result.email })
}
