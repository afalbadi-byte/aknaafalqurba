import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, isCommittee, jsonOK, jsonError } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser()
  if (error) return error
  const id = Number((await ctx.params).id)

  const [row] = await sql`
    SELECT a.*, m.full_name AS member_name, m.phone AS member_phone, m.branch AS member_branch
    FROM aid_requests a JOIN members m ON m.id = a.member_id
    WHERE a.id = ${id}
  `
  if (!row) return jsonError('not_found', 'الطلب غير موجود', 404)
  if (row.member_id !== user.id && !isCommittee(user)) {
    return jsonError('forbidden', 'لا تملك الصلاحية', 403)
  }

  const updates = isCommittee(user)
    ? await sql`
        SELECT au.*, m.full_name AS author_name, m.role AS author_role
        FROM aid_updates au JOIN members m ON m.id = au.author_id
        WHERE au.aid_id = ${id} ORDER BY au.created_at
      `
    : await sql`
        SELECT au.*, m.full_name AS author_name, m.role AS author_role
        FROM aid_updates au JOIN members m ON m.id = au.author_id
        WHERE au.aid_id = ${id} AND au.is_internal = FALSE
        ORDER BY au.created_at
      `

  return jsonOK({ request: row, updates })
}
