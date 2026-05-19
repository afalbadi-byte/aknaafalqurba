import { sql } from '@/lib/db'
import { requireUser, jsonOK } from '@/lib/auth'

export async function GET() {
  const { error } = await requireUser()
  if (error) return error
  const rows = await sql`
    SELECT id, full_name, branch, city, role FROM members
    WHERE status = 'active' ORDER BY full_name
  `
  return jsonOK({ members: rows })
}
