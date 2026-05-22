/**
 * POST /api/admin-promote
 * Promotes a member to admin role using MIGRATE_SECRET for auth.
 * Emergency use only — when no admin account is accessible.
 *
 * Body: { "phone": "05XXXXXXXXX" }   OR   { "national_id": "1XXXXXXXXX" }
 * Header: x-migrate-secret: <MIGRATE_SECRET>
 */
import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { jsonOK, jsonError, parseJson } from '@/lib/auth'

export async function POST(req: NextRequest) {
  // Auth: MIGRATE_SECRET only — no session (that's the point)
  const secret    = req.headers.get('x-migrate-secret')
  const envSecret = process.env.MIGRATE_SECRET

  if (!envSecret)        return jsonError('not_configured', 'MIGRATE_SECRET غير مضبوط في متغيرات البيئة', 500)
  if (secret !== envSecret) return jsonError('forbidden', 'مفتاح غير صحيح', 403)

  const body = await parseJson(req)
  const phone       = body.phone       ? String(body.phone).trim()       : null
  const national_id = body.national_id ? String(body.national_id).trim() : null

  if (!phone && !national_id)
    return jsonError('bad_request', 'أرسل phone أو national_id', 400)

  const rows = await sql`
    SELECT id, full_name, phone, role, status
    FROM members
    WHERE (phone = ${phone} OR national_id = ${national_id})
    LIMIT 1
  `
  const m = rows[0]
  if (!m) return jsonError('not_found', 'العضو غير موجود', 404)

  await sql`
    UPDATE members
    SET role = 'admin', status = 'active'
    WHERE id = ${m.id}
  `

  return jsonOK({
    message: `تم ترقية ${m.full_name} إلى مدير النظام`,
    member:  { id: m.id, full_name: m.full_name, phone: m.phone, old_role: m.role },
  })
}
