import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { log, getIP } from '@/lib/log'

const VALID  = ['submitted', 'under_review', 'approved', 'rejected', 'disbursed']
const TITLES: Record<string, string> = {
  under_review: 'طلبك قيد المراجعة',
  approved:     'تم اعتماد طلب المعونة',
  rejected:     'تم رفض طلب المعونة',
  disbursed:    'تم صرف المعونة',
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(['admin', 'president', 'aid_committee'])
  if (error) return error

  const id   = Number((await ctx.params).id)
  const body = await parseJson(req)
  if (!VALID.includes(body.status)) return jsonError('bad_status', 'حالة غير صالحة', 400)

  const [a] = await sql<{ title: string; member_id: number }[]>`
    SELECT title, member_id FROM aid_requests WHERE id = ${id}
  `
  if (!a) return jsonError('not_found', 'الطلب غير موجود', 404)

  await sql`
    UPDATE aid_requests
    SET status          = ${body.status},
        committee_notes = COALESCE(${body.committee_notes || null}, committee_notes),
        approved_amount = COALESCE(${body.approved_amount ? Number(body.approved_amount) : null}, approved_amount),
        reviewed_by     = ${user.id},
        reviewed_at     = NOW(),
        disbursed_at    = CASE WHEN ${body.status} = 'disbursed' THEN NOW() ELSE disbursed_at END,
        updated_at      = NOW()
    WHERE id = ${id}
  `

  void log(user.id, 'aid.status_change', { ip: getIP(req), member_name: user.full_name, entity: 'aid', entity_id: id, details: { new_status: body.status, title: a.title } })
  if (TITLES[body.status]) {
    await notify(a.member_id, `aid_${body.status}`, TITLES[body.status], a.title, '/aid')
  }
  return jsonOK()
}
