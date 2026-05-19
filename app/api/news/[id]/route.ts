import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { currentUser, requireRole, COMMITTEE_ROLES, TOP_ADMIN_ROLES, jsonOK, jsonError } from '@/lib/auth'
import { saveUpload } from '@/lib/storage'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id)
  const [row] = await sql`
    SELECT n.*, m.full_name AS author_name FROM news n
    JOIN members m ON m.id = n.author_id WHERE n.id = ${id}
  `
  if (!row) return jsonError('not_found', 'الخبر غير موجود', 404)
  if (!row.is_public) {
    const u = await currentUser()
    if (!u) return jsonError('unauthenticated', 'يرجى تسجيل الدخول', 401)
  }
  return jsonOK({ news: row })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error

  const id = Number((await ctx.params).id)
  const fd = await req.formData()

  let cover: string | null = null
  try { cover = await saveUpload(fd.get('cover_image') as File | null, 'news') }
  catch (e: any) { return jsonError('upload_error', e.message, 400) }

  const sets: Record<string, any> = { updated_at: new Date() }
  for (const f of ['title', 'category', 'summary', 'body']) {
    if (fd.get(f) !== null) sets[f] = String(fd.get(f))
  }
  for (const f of ['is_pinned', 'is_public']) {
    if (fd.get(f) !== null) sets[f] = fd.get(f) === '1'
  }
  if (cover) sets.cover_image = cover
  await sql`UPDATE news SET ${sql(sets)} WHERE id = ${id}`
  return jsonOK()
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  await sql`DELETE FROM news WHERE id = ${Number((await ctx.params).id)}`
  return jsonOK()
}
