import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, isAdmin, jsonOK, jsonError, parseJson } from '@/lib/auth'

const FIELDS = ['full_name', 'national_id', 'phone', 'email', 'branch', 'birth_year', 'city', 'address', 'notes'] as const

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await parseJson(req)
  const id   = Number(body.id || user.id)
  if (id !== user.id && !isAdmin(user)) return jsonError('forbidden', 'لا تملك الصلاحية', 403)

  // Build update dynamically — only the fields actually present
  const sets: Record<string, any> = {}
  for (const f of FIELDS) {
    if (f in body) sets[f] = typeof body[f] === 'string' ? body[f].trim() : body[f]
  }
  if (!Object.keys(sets).length) return jsonError('no_changes', 'لا توجد تعديلات', 400)

  await sql`UPDATE members SET ${sql(sets)}, updated_at = NOW() WHERE id = ${id}`
  return jsonOK()
}
