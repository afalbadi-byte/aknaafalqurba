import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'

const VALID = ['pending', 'active', 'suspended']

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const id   = Number((await ctx.params).id)
  const body = await parseJson(req)
  if (!VALID.includes(body.status)) return jsonError('bad_status', 'حالة غير صالحة', 400)
  await sql`UPDATE members SET status = ${body.status}, updated_at = NOW() WHERE id = ${id}`
  return jsonOK()
}
