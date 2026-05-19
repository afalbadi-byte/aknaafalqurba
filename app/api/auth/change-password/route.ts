import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, hashPassword, verifyPassword, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await parseJson(req)
  const fe = requireFields(body, ['current_password', 'new_password'])
  if (fe) return fe

  const [row] = await sql<{ password_hash: string }[]>`
    SELECT password_hash FROM members WHERE id = ${user.id}
  `
  if (!row || !(await verifyPassword(body.current_password, row.password_hash))) {
    return jsonError('bad_password', 'كلمة المرور الحالية غير صحيحة', 401)
  }
  if (String(body.new_password).length < 6) return jsonError('weak_password', 'كلمة المرور الجديدة قصيرة', 400)

  const hash = await hashPassword(body.new_password)
  await sql`UPDATE members SET password_hash = ${hash} WHERE id = ${user.id}`
  return jsonOK()
}
