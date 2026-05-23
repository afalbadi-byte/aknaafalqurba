import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

const CATEGORIES = ['hosting', 'database', 'email', 'ai', 'storage', 'payment', 'domain', 'other']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const { id } = await params
  const body = await parseJson(req)
  if (!body) return jsonError('no_data', 'لا توجد بيانات', 400)

  const category = body.category && CATEGORIES.includes(body.category) ? body.category : null

  await sql`
    UPDATE platform_costs SET
      service_name = COALESCE(${body.service_name ?? null}, service_name),
      plan         = ${body.plan ?? null},
      category     = COALESCE(${category}, category),
      monthly_cost = COALESCE(${body.monthly_cost != null ? Number(body.monthly_cost) : null}, monthly_cost),
      currency     = COALESCE(${body.currency ?? null}, currency),
      notes        = ${body.notes ?? null},
      is_active    = COALESCE(${body.is_active != null ? !!body.is_active : null}, is_active),
      sort_order   = COALESCE(${body.sort_order != null ? Number(body.sort_order) : null}, sort_order),
      updated_at   = NOW()
    WHERE id = ${Number(id)}
  `
  void log(user!.id, 'cost.update', { ip: getIP(req), member_name: user!.full_name, details: { id } })
  return jsonOK()
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const { id } = await params
  await sql`DELETE FROM platform_costs WHERE id = ${Number(id)}`
  void log(user!.id, 'cost.delete', { ip: getIP(req), member_name: user!.full_name, details: { id } })
  return jsonOK()
}
