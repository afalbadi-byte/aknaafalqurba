import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, isAdmin, jsonOK, jsonError } from '@/lib/auth'

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser()
  if (error) return error
  const id = Number((await ctx.params).id)
  const [dep] = await sql<{ member_id: number }[]>`SELECT member_id FROM family_dependents WHERE id = ${id}`
  if (!dep) return jsonError('not_found', 'غير موجود', 404)
  if (dep.member_id !== user.id && !isAdmin(user)) return jsonError('forbidden', 'لا تملك الصلاحية', 403)
  await sql`DELETE FROM family_dependents WHERE id = ${id}`
  return jsonOK()
}
