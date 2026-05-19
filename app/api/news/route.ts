import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { currentUser, requireRole, COMMITTEE_ROLES, jsonOK, jsonError } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { saveUpload } from '@/lib/storage'

// GET: list (everyone can list public news; logged-in see all)
export async function GET(req: NextRequest) {
  const u = await currentUser()
  const cat = new URL(req.url).searchParams.get('category')

  let rows
  if (u && cat) {
    rows = await sql`
      SELECT n.id, n.title, n.category, n.summary, n.cover_image, n.is_pinned, n.is_public,
             n.published_at, m.full_name AS author_name
      FROM news n JOIN members m ON m.id = n.author_id
      WHERE n.category = ${cat}
      ORDER BY n.is_pinned DESC, n.published_at DESC LIMIT 100
    `
  } else if (u) {
    rows = await sql`
      SELECT n.id, n.title, n.category, n.summary, n.cover_image, n.is_pinned, n.is_public,
             n.published_at, m.full_name AS author_name
      FROM news n JOIN members m ON m.id = n.author_id
      ORDER BY n.is_pinned DESC, n.published_at DESC LIMIT 100
    `
  } else if (cat) {
    rows = await sql`
      SELECT n.id, n.title, n.category, n.summary, n.cover_image, n.is_pinned, n.is_public,
             n.published_at, m.full_name AS author_name
      FROM news n JOIN members m ON m.id = n.author_id
      WHERE n.is_public = TRUE AND n.category = ${cat}
      ORDER BY n.is_pinned DESC, n.published_at DESC LIMIT 100
    `
  } else {
    rows = await sql`
      SELECT n.id, n.title, n.category, n.summary, n.cover_image, n.is_pinned, n.is_public,
             n.published_at, m.full_name AS author_name
      FROM news n JOIN members m ON m.id = n.author_id
      WHERE n.is_public = TRUE
      ORDER BY n.is_pinned DESC, n.published_at DESC LIMIT 100
    `
  }
  return jsonOK({ news: rows })
}

// POST: create
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error

  const fd = await req.formData()
  if (!fd.get('title') || !fd.get('body')) return jsonError('missing_field', 'بيانات ناقصة', 400)

  let cover: string | null = null
  try { cover = await saveUpload(fd.get('cover_image') as File | null, 'news') }
  catch (e: any) { return jsonError('upload_error', e.message, 400) }

  const [ins] = await sql<{ id: number }[]>`
    INSERT INTO news (title, category, summary, body, cover_image, is_pinned, is_public, author_id)
    VALUES (
      ${String(fd.get('title')).trim()},
      ${String(fd.get('category') || 'general')},
      ${(fd.get('summary') as string) || null},
      ${String(fd.get('body'))},
      ${cover},
      ${fd.get('is_pinned') === '1'},
      ${fd.get('is_public') === '1'},
      ${user.id}
    )
    RETURNING id
  `

  const members = await sql<{ id: number }[]>`
    SELECT id FROM members WHERE status = 'active' AND id <> ${user.id}
  `
  await Promise.all(members.map(m =>
    notify(m.id, 'news', `خبر جديد: ${fd.get('title')}`, null, `/news/${ins.id}`)
  ))

  return jsonOK({ id: ins.id })
}
