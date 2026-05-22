import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TREASURY_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { log, getIP } from '@/lib/log'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TREASURY_ROLES)
  if (error) return error

  const id   = Number((await ctx.params).id)
  const body = await parseJson(req)
  if (!['approved', 'rejected'].includes(body.decision))
    return jsonError('bad_decision', 'قرار غير صالح', 400)

  const [p] = await sql<{ amount: string; member_id: number }[]>`
    SELECT amount, member_id FROM payments WHERE id = ${id}
  `
  if (!p) return jsonError('not_found', 'الدفعة غير موجودة', 404)

  await sql`
    UPDATE payments
    SET status = ${body.decision},
        reviewed_by = ${user.id},
        reviewed_at = NOW(),
        reviewer_notes = ${body.notes || null},
        updated_at = NOW()
    WHERE id = ${id}
  `

  const title = body.decision === 'approved' ? 'تم اعتماد دفعتك' : 'تم رفض دفعتك'
  await notify(p.member_id, `payment_${body.decision}`, title,
    `مبلغ ${Number(p.amount).toFixed(2)} ر.س`, '/payments')

  void log(user.id, `payment.${body.decision}`, { ip: getIP(req), member_name: user.full_name, entity: 'payment', entity_id: id, details: { amount: p.amount, member_id: p.member_id } })
  return jsonOK()
}
