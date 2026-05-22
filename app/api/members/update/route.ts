import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, isAdmin, jsonOK, jsonError, parseJson } from '@/lib/auth'

// Email is intentionally excluded — it must go through the verified flow
// at /api/members/email-change → /api/members/email-confirm
const FIELDS = ['full_name', 'national_id', 'phone', 'branch', 'birth_year', 'birth_date', 'city', 'address', 'notes', 'gender', 'generation_number'] as const

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await parseJson(req)
  const id   = Number(body.id || user.id)
  if (id !== user.id && !isAdmin(user)) return jsonError('forbidden', 'لا تملك الصلاحية', 403)

  // Check national_id uniqueness before updating
  if (body.national_id) {
    const nid = String(body.national_id).replace(/\D/g, '')
    const clash = await sql`
      SELECT id FROM members WHERE national_id = ${nid} AND id != ${id}
    `
    if (clash.length)
      return jsonError('national_id_in_use', 'رقم الهوية مستخدم لدى عضو آخر', 409)
    body.national_id = nid
  }

  // Build update dynamically — only the fields actually present
  const sets: Record<string, any> = {}
  for (const f of FIELDS) {
    if (f in body) sets[f] = typeof body[f] === 'string' ? body[f].trim() : body[f]
  }
  if (!Object.keys(sets).length) return jsonError('no_changes', 'لا توجد تعديلات', 400)

  try {
    await sql`UPDATE members SET ${sql(sets)}, updated_at = NOW() WHERE id = ${id}`
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('national_id'))
      return jsonError('national_id_in_use', 'رقم الهوية مستخدم لدى عضو آخر', 409)
    throw e
  }

  return jsonOK()
}
