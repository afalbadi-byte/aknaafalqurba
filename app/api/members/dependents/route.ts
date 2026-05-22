import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, isCommittee, isAdmin, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error
  const mid = Number(new URL(req.url).searchParams.get('member_id') || user.id)
  if (mid !== user.id && !isCommittee(user)) return jsonError('forbidden', 'لا تملك الصلاحية', 403)
  const rows = await sql`SELECT * FROM family_dependents WHERE member_id = ${mid} ORDER BY id`
  return jsonOK({ dependents: rows })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error
  const body = await parseJson(req)
  const mid  = Number(body.member_id || user.id)
  if (mid !== user.id && !isAdmin(user)) return jsonError('forbidden', 'لا تملك الصلاحية', 403)
  const fe = requireFields(body, ['full_name', 'relation'])
  if (fe) return fe

  // Validate birth_date if provided
  const birthDate = typeof body.birth_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.birth_date)
    ? body.birth_date
    : null
  // Derive birth_year from birth_date, or use legacy birth_year field
  const birthYear = birthDate
    ? Number(birthDate.slice(0, 4))
    : (body.birth_year ? Number(body.birth_year) : null)

  let id: number
  try {
    const [ins] = await sql<{ id: number }[]>`
      INSERT INTO family_dependents (member_id, full_name, relation, birth_date, birth_year, notes)
      VALUES (${mid}, ${body.full_name.trim()}, ${body.relation},
              ${birthDate}, ${birthYear}, ${body.notes || null})
      RETURNING id
    `
    id = ins.id
  } catch {
    // Fallback: migration 013 not yet applied
    const [ins] = await sql<{ id: number }[]>`
      INSERT INTO family_dependents (member_id, full_name, relation, birth_year, notes)
      VALUES (${mid}, ${body.full_name.trim()}, ${body.relation},
              ${birthYear}, ${body.notes || null})
      RETURNING id
    `
    id = ins.id
  }

  return jsonOK({ id })
}
