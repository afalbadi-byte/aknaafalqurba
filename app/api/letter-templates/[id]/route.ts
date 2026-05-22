import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, COMMITTEE_ROLES, jsonOK, jsonError } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error
  const id = Number((await ctx.params).id)
  await sql`DELETE FROM letter_templates WHERE id = ${id}`
  void log(user!.id, 'letter_template.delete', {
    ip: getIP(req), member_name: user!.full_name,
    entity: 'letter_template', entity_id: id,
  })
  return jsonOK()
}
