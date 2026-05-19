import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, jsonOK, parseJson } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error
  const body = await parseJson(req)
  if (body.all) {
    await sql`UPDATE notifications SET is_read = TRUE WHERE member_id = ${user.id}`
  } else if (body.id) {
    await sql`UPDATE notifications SET is_read = TRUE WHERE member_id = ${user.id} AND id = ${body.id}`
  }
  return jsonOK()
}
