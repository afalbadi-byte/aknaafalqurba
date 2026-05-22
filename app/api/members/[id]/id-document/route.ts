import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, COMMITTEE_ROLES, jsonOK, jsonError } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error

  const id = Number((await ctx.params).id)
  try {
    const [row] = await sql<{ id_document: string | null }[]>`
      SELECT id_document FROM members WHERE id = ${id}
    `
    if (!row) return jsonError('not_found', 'العضو غير موجود', 404)
    if (!row.id_document) return jsonError('no_document', 'لم يرفع هذا العضو صورة هوية', 404)
    return jsonOK({ id_document: row.id_document })
  } catch {
    return jsonError('migration_pending', 'تتطلب هذه الميزة تطبيق هجرة 011', 503)
  }
}
