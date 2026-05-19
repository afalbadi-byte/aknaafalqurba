import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK } from '@/lib/auth'

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  await sql`DELETE FROM expenses WHERE id = ${Number((await ctx.params).id)}`
  return jsonOK()
}
