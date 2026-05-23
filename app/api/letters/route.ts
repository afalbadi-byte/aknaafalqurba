import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TREASURY_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

export async function GET() {
  const { user, error } = await requireRole(TREASURY_ROLES)
  if (error) return error
  const letters = await sql`
    SELECT l.*, m.full_name AS created_by_name
    FROM letters l
    LEFT JOIN members m ON m.id = l.created_by
    ORDER BY l.created_at DESC
    LIMIT 200
  `
  return jsonOK({ letters })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(TREASURY_ROLES)
  if (error) return error
  const body = await parseJson(req)
  if (!body) return jsonError('no_data', 'لا توجد بيانات', 400)

  const [letter] = await sql`
    INSERT INTO letters (reference, date, recipient, subject, body, sign_name, sign_title, show_stamp, created_by)
    VALUES (
      ${body.reference || null},
      ${body.date || null},
      ${body.recipient || null},
      ${body.subject || null},
      ${body.body || ''},
      ${body.sign_name || null},
      ${body.sign_title || null},
      ${!!body.show_stamp},
      ${user!.id}
    )
    RETURNING *
  `
  void log(user!.id, 'letter.create', { ip: getIP(req), member_name: user!.full_name, details: { subject: body.subject } })
  return jsonOK({ letter })
}
