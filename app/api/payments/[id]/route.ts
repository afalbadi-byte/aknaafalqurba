import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, TREASURY_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

/** PATCH: financial manager edits payment amount / reference / period */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TREASURY_ROLES)
  if (error) return error

  const id   = Number((await ctx.params).id)
  const body = await parseJson(req)

  const updates: Record<string, any> = {}
  if (body.amount    != null) updates.amount    = Number(body.amount)
  if (body.reference != null) updates.reference = String(body.reference).trim() || null
  if (body.period_year  != null) updates.period_year  = Number(body.period_year)
  if (body.period_month != null) updates.period_month = Number(body.period_month)
  if (body.notes     != null) updates.notes     = String(body.notes).trim() || null

  if (Object.keys(updates).length === 0)
    return jsonError('no_changes', 'لا توجد تعديلات', 400)

  await sql`UPDATE payments SET ${sql(updates)}, updated_at = NOW() WHERE id = ${id}`
  void log(user!.id, 'payment.edit', {
    ip: getIP(req), member_name: user!.full_name,
    entity: 'payment', entity_id: id, details: updates,
  })
  return jsonOK()
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const id = Number((await ctx.params).id)
  await sql`DELETE FROM payments WHERE id = ${id}`
  void log(user!.id, 'payment.delete', { ip: getIP(req), member_name: user!.full_name, entity: 'payment', entity_id: id })
  return jsonOK()
}
