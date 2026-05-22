import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { log, getIP } from '@/lib/log'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const id = Number((await ctx.params).id)
  // Approve + delete stored ID document (privacy — no longer needed after manual approval)
  await sql`UPDATE members SET status = 'active', id_document = NULL, updated_at = NOW() WHERE id = ${id}`
  void log(user!.id, 'member.approve', { ip: getIP(req), member_name: user!.full_name, entity: 'member', entity_id: id })
  await notify(id, 'account_active', 'تم تفعيل حسابك', 'مرحباً بك في صندوق أكناف القربى', '/dashboard')
  return jsonOK()
}
