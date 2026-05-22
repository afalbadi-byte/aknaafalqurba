/**
 * POST /api/admin-promote
 * Emergency member management using MIGRATE_SECRET for auth.
 * Header: x-migrate-secret: <MIGRATE_SECRET>
 *
 * Promote:  { "action": "promote",  "phone": "05X" }  → role=admin, status=active
 * Delete:   { "action": "delete",   "phone": "05X" }  → hard delete (irreversible)
 * Default action is "promote" for backward compat.
 */
import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { jsonOK, jsonError, parseJson } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const secret    = req.headers.get('x-migrate-secret')
  const envSecret = process.env.MIGRATE_SECRET

  if (!envSecret)           return jsonError('not_configured', 'MIGRATE_SECRET غير مضبوط', 500)
  if (secret !== envSecret) return jsonError('forbidden', 'مفتاح غير صحيح', 403)

  const body      = await parseJson(req)
  const action    = body.action || 'promote'
  const phone     = body.phone       ? String(body.phone).trim()       : null
  const nationalId = body.national_id ? String(body.national_id).trim() : null

  if (!phone && !nationalId)
    return jsonError('bad_request', 'أرسل phone أو national_id', 400)

  // Find member — if searching by national_id and duplicates exist, take the SECOND one (higher id)
  const rows = action === 'delete' && nationalId && !phone
    ? await sql`
        SELECT id, full_name, phone, role, status FROM members
        WHERE national_id = ${nationalId}
        ORDER BY id DESC LIMIT 1
      `
    : await sql`
        SELECT id, full_name, phone, role, status FROM members
        WHERE (${phone ? sql`phone = ${phone}` : sql`national_id = ${nationalId}`})
        ORDER BY id LIMIT 1
      `

  const m = rows[0]
  if (!m) return jsonError('not_found', 'العضو غير موجود', 404)

  if (action === 'delete') {
    // Safety: cannot delete an admin
    if (['admin', 'president'].includes(m.role))
      return jsonError('forbidden', 'لا يمكن حذف حساب مدير — غيّر دوره أولاً', 403)

    await sql`DELETE FROM members WHERE id = ${m.id}`
    return jsonOK({ message: `تم حذف حساب ${m.full_name} (${m.phone}) نهائياً` })
  }

  // Default: promote
  await sql`UPDATE members SET role = 'admin', status = 'active' WHERE id = ${m.id}`
  return jsonOK({
    message: `تم ترقية ${m.full_name} إلى مدير النظام`,
    member:  { id: m.id, full_name: m.full_name, phone: m.phone, old_role: m.role },
  })
}
