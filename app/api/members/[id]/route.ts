import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, isCommittee, isAdmin, jsonOK, jsonError } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser()
  if (error) return error

  const id = Number((await ctx.params).id)
  if (id !== user.id && !isCommittee(user)) return jsonError('forbidden', 'لا تملك الصلاحية', 403)

  const [row] = await sql`
    SELECT id, full_name, national_id, phone, email, branch, birth_year, city,
           address, role, status, avatar, notes, created_at
    FROM members WHERE id = ${id}
  `
  if (!row) return jsonError('not_found', 'العضو غير موجود', 404)
  // إخفاء حقول حساسة لغير الأدمن
  if (id !== user.id && !isAdmin(user)) {
    delete row.national_id; delete row.address
  }
  return jsonOK({ member: row })
}
