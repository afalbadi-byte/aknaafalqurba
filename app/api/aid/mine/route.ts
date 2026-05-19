import { sql } from '@/lib/db'
import { requireUser, jsonOK } from '@/lib/auth'

export async function GET() {
  const { user, error } = await requireUser()
  if (error) return error
  const rows = await sql`
    SELECT * FROM aid_requests WHERE member_id = ${user.id} ORDER BY created_at DESC
  `
  return jsonOK({ requests: rows })
}
