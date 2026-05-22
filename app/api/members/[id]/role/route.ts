import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

const VALID = ['member', 'aid_committee', 'secretary', 'treasurer', 'president', 'admin']

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const id   = Number((await ctx.params).id)
  const body = await parseJson(req)
  if (!VALID.includes(body.role)) return jsonError('bad_role', 'دور غير صالح', 400)
  await sql`UPDATE members SET role = ${body.role}, updated_at = NOW() WHERE id = ${id}`
  void log(user!.id, 'member.role_change', { ip: getIP(req), member_name: user!.full_name, entity: 'member', entity_id: id, details: { new_role: body.role } })
  return jsonOK()
}
