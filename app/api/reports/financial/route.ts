import { sql } from '@/lib/db'
import { requireRole, TREASURY_ROLES, jsonOK } from '@/lib/auth'

export async function GET() {
  const { error } = await requireRole(TREASURY_ROLES)
  if (error) return error

  const income = await sql`
    SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
           SUM(amount)::float8 AS total, COUNT(*) AS cnt
    FROM payments
    WHERE status = 'approved' AND created_at >= NOW() - INTERVAL '12 months'
    GROUP BY month ORDER BY month
  `
  const expense = await sql`
    SELECT TO_CHAR(expense_date, 'YYYY-MM') AS month, SUM(amount)::float8 AS total
    FROM expenses WHERE expense_date >= NOW() - INTERVAL '12 months'
    GROUP BY month ORDER BY month
  `
  const by_type = await sql`
    SELECT payment_type, SUM(amount)::float8 AS total
    FROM payments WHERE status='approved' GROUP BY payment_type
  `
  const by_method = await sql`
    SELECT method, SUM(amount)::float8 AS total, COUNT(*) AS cnt
    FROM payments WHERE status='approved' GROUP BY method
  `
  const expense_by_category = await sql`
    SELECT COALESCE(category, 'أخرى') AS category, SUM(amount)::float8 AS total
    FROM expenses GROUP BY category ORDER BY total DESC
  `
  const top_contributors = await sql`
    SELECT m.id, m.full_name, m.branch, SUM(p.amount)::float8 AS total, COUNT(*) AS cnt
    FROM payments p JOIN members m ON m.id = p.member_id
    WHERE p.status = 'approved'
    GROUP BY m.id, m.full_name, m.branch
    ORDER BY total DESC LIMIT 20
  `

  return jsonOK({
    income_monthly:      income,
    expense_monthly:     expense,
    by_type, by_method,
    expense_by_category,
    top_contributors,
  })
}
