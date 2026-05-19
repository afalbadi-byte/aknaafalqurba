import { sql } from '@/lib/db'
import { requireUser, isCommittee, jsonOK } from '@/lib/auth'

export async function GET() {
  const { user, error } = await requireUser()
  if (error) return error

  const [personal] = await sql<any[]>`
    SELECT
      COALESCE(SUM(CASE WHEN status='approved' THEN amount END), 0)::float8 AS total_paid,
      COUNT(*) FILTER (WHERE status='pending')  AS pending_count,
      COUNT(*) FILTER (WHERE status='approved') AS approved_count
    FROM payments WHERE member_id = ${user.id}
  `
  const [aid] = await sql<any[]>`
    SELECT
      COUNT(*) AS total_requests,
      COUNT(*) FILTER (WHERE status IN ('submitted','under_review')) AS open_requests
    FROM aid_requests WHERE member_id = ${user.id}
  `
  const [unread] = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM notifications WHERE member_id = ${user.id} AND is_read = FALSE
  `

  const out: any = {
    personal: {
      total_paid:      Number(personal.total_paid),
      pending_count:   Number(personal.pending_count),
      approved_count:  Number(personal.approved_count),
      total_requests:  Number(aid.total_requests),
      open_requests:   Number(aid.open_requests),
      unread_notifs:   Number(unread.c),
    },
  }

  if (isCommittee(user)) {
    const [fund] = await sql<any[]>`
      SELECT
        COALESCE(SUM(CASE WHEN status='approved' THEN amount END),0)::float8 AS total_collected,
        COUNT(*) FILTER (WHERE status='pending') AS pending_payments
      FROM payments
    `
    const [exp] = await sql<any[]>`SELECT COALESCE(SUM(amount),0)::float8 AS total_expenses FROM expenses`
    const [mc]  = await sql<any[]>`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status='active')  AS active,
             COUNT(*) FILTER (WHERE status='pending') AS pending
      FROM members
    `
    const [ac]  = await sql<any[]>`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status IN ('submitted','under_review')) AS open
      FROM aid_requests
    `
    out.fund = {
      total_collected:  Number(fund.total_collected),
      total_expenses:   Number(exp.total_expenses),
      balance:          Number(fund.total_collected) - Number(exp.total_expenses),
      pending_payments: Number(fund.pending_payments),
      members_total:    Number(mc.total),
      members_active:   Number(mc.active),
      members_pending:  Number(mc.pending),
      aid_total:        Number(ac.total),
      aid_open:         Number(ac.open),
    }
  }
  return jsonOK(out)
}
