import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, isCommittee, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { notify } from '@/lib/notify'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser()
  if (error) return error

  const aid_id = Number((await ctx.params).id)
  const body   = await parseJson(req)
  const fe = requireFields(body, ['body'])
  if (fe) return fe

  const [a] = await sql<{ member_id: number; title: string }[]>`
    SELECT member_id, title FROM aid_requests WHERE id = ${aid_id}
  `
  if (!a) return jsonError('not_found', 'الطلب غير موجود', 404)
  if (a.member_id !== user.id && !isCommittee(user)) return jsonError('forbidden', 'لا تملك الصلاحية', 403)

  let is_internal = !!body.is_internal
  if (is_internal && !isCommittee(user)) is_internal = false

  await sql`
    INSERT INTO aid_updates (aid_id, author_id, body, is_internal)
    VALUES (${aid_id}, ${user.id}, ${String(body.body).trim()}, ${is_internal})
  `

  if (!is_internal && a.member_id !== user.id) {
    await notify(a.member_id, 'aid_comment', 'رد جديد على طلبك',
      String(body.body).slice(0, 80), `/aid/${aid_id}`)
  }
  return jsonOK()
}
