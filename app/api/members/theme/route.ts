import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, jsonOK, jsonError, parseJson } from '@/lib/auth'

const VALID = ['light', 'dark', 'system']

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error
  const body = await parseJson(req)
  if (!VALID.includes(body.theme)) return jsonError('bad_theme', 'قيمة غير صالحة', 400)
  await sql`UPDATE members SET theme = ${body.theme}, updated_at = NOW() WHERE id = ${user.id}`
  return jsonOK({ theme: body.theme })
}
