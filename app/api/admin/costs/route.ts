import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

const CATEGORIES = ['hosting', 'database', 'email', 'ai', 'storage', 'payment', 'domain', 'other']

export async function GET() {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const rows = await sql`
    SELECT * FROM platform_costs
    ORDER BY is_active DESC, sort_order, id
  `
  return jsonOK({ costs: rows })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const body = await parseJson(req)
  if (!body?.service_name) return jsonError('missing', 'اسم الخدمة مطلوب', 400)

  const category = CATEGORIES.includes(body.category) ? body.category : 'other'
  const [row] = await sql`
    INSERT INTO platform_costs (service_name, plan, category, monthly_cost, currency, notes, sort_order)
    VALUES (
      ${body.service_name},
      ${body.plan || null},
      ${category},
      ${Number(body.monthly_cost) || 0},
      ${body.currency || 'SAR'},
      ${body.notes || null},
      ${Number(body.sort_order) || 999}
    )
    RETURNING *
  `
  void log(user!.id, 'cost.create', { ip: getIP(req), member_name: user!.full_name, details: { service: body.service_name } })
  return jsonOK({ cost: row })
}
