import { sql } from '@/lib/db'
import { requireUser, jsonOK } from '@/lib/auth'

export async function GET() {
  const { user, error } = await requireUser()
  if (error) return error
  const rows = await sql`
    SELECT * FROM notifications WHERE member_id = ${user.id}
    ORDER BY created_at DESC LIMIT 50
  `
  const [u] = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM notifications WHERE member_id = ${user.id} AND is_read = FALSE
  `
  return jsonOK({ notifications: rows, unread_count: Number(u.c) })
}
