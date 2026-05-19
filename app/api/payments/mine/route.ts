import { sql } from '@/lib/db'
import { requireUser, jsonOK } from '@/lib/auth'

export async function GET() {
  const { user, error } = await requireUser()
  if (error) return error
  const rows = await sql`
    SELECT * FROM payments WHERE member_id = ${user.id} ORDER BY created_at DESC
  `
  const total = rows.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount), 0)
  return jsonOK({ payments: rows, total_approved: total })
}
