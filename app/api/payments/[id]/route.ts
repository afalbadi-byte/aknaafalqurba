import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const id = Number((await ctx.params).id)
  await sql`DELETE FROM payments WHERE id = ${id}`
  void log(user!.id, 'payment.delete', { ip: getIP(req), member_name: user!.full_name, entity: 'payment', entity_id: id })
  return jsonOK()
}
