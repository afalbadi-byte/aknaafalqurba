import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error

  const params  = new URL(req.url).searchParams
  const action  = params.get('action')   // filter by action prefix e.g. 'auth', 'payment'
  const limit   = Math.min(Number(params.get('limit') || 200), 1000)

  const rows = action
    ? await sql`
        SELECT l.id, l.member_id, l.member_name, l.action, l.entity, l.entity_id,
               l.details, l.ip, l.created_at
        FROM activity_logs l
        WHERE l.action LIKE ${action + '.%'} OR l.action = ${action}
        ORDER BY l.created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT l.id, l.member_id, l.member_name, l.action, l.entity, l.entity_id,
               l.details, l.ip, l.created_at
        FROM activity_logs l
        ORDER BY l.created_at DESC
        LIMIT ${limit}
      `

  return jsonOK({ logs: rows })
}
