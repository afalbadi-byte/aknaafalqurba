import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK } from '@/lib/auth'
import { notify } from '@/lib/notify'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const id = Number((await ctx.params).id)
  await sql`UPDATE members SET status = 'active', updated_at = NOW() WHERE id = ${id}`
  await notify(id, 'account_active', 'تم تفعيل حسابك', 'مرحباً بك في صندوق أكناف القربى', '/dashboard')
  return jsonOK()
}
