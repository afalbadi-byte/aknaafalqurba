import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, COMMITTEE_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

export async function GET() {
  const { error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error
  try {
    const rows = await sql`
      SELECT id, category, title, subject, body, created_at
      FROM letter_templates
      ORDER BY category, title
    `
    return jsonOK({ templates: rows })
  } catch {
    return jsonOK({ templates: [] })   // migration not applied yet
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error

  const body = await parseJson(req)
  if (!body?.title?.trim()) return jsonError('missing_field', 'عنوان النموذج مطلوب', 400)
  if (!body?.body?.trim()) return jsonError('missing_field', 'محتوى النموذج مطلوب', 400)

  const [ins] = await sql<{ id: number }[]>`
    INSERT INTO letter_templates (category, title, subject, body, created_by)
    VALUES (
      ${String(body.category || 'إدارية عامة')},
      ${String(body.title).trim()},
      ${String(body.subject || '').trim()},
      ${String(body.body).trim()},
      ${user!.id}
    )
    RETURNING id
  `
  void log(user!.id, 'letter_template.create', {
    member_name: user!.full_name, entity: 'letter_template', entity_id: ins.id,
    details: { title: body.title },
  })
  return jsonOK({ id: ins.id })
}
