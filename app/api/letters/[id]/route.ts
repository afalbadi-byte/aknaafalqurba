import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TREASURY_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TREASURY_ROLES)
  if (error) return error
  const { id } = await params
  const body = await parseJson(req)
  if (!body) return jsonError('no_data', 'لا توجد بيانات', 400)

  await sql`
    UPDATE letters SET
      reference  = ${body.reference || null},
      date       = ${body.date || null},
      recipient  = ${body.recipient || null},
      subject    = ${body.subject || null},
      body       = ${body.body || ''},
      sign_name  = ${body.sign_name || null},
      sign_title = ${body.sign_title || null},
      show_stamp = ${!!body.show_stamp},
      updated_at = NOW()
    WHERE id = ${Number(id)}
  `
  return jsonOK()
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TREASURY_ROLES)
  if (error) return error
  const { id } = await params
  await sql`DELETE FROM letters WHERE id = ${Number(id)}`
  void log(user!.id, 'letter.delete', { ip: getIP(req), member_name: user!.full_name, details: { id } })
  return jsonOK()
}
