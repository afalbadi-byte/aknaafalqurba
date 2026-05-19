import { sql } from '@/lib/db'
import { requireRole, TREASURY_ROLES, jsonOK } from '@/lib/auth'

export async function GET() {
  const { error } = await requireRole(TREASURY_ROLES)
  if (error) return error
  const rows = await sql`
    SELECT m.id, m.full_name, m.branch,
           COALESCE(SUM(CASE WHEN p.status='approved' THEN p.amount END),0)::float8 AS total_paid,
           COUNT(*) FILTER (WHERE p.status='approved') AS payments_count,
           MAX(p.created_at) AS last_payment
    FROM members m LEFT JOIN payments p ON p.member_id = m.id
    WHERE m.status = 'active'
    GROUP BY m.id, m.full_name, m.branch
    ORDER BY total_paid DESC
  `
  return jsonOK({ members: rows })
}
