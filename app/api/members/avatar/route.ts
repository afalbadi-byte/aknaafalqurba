import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, jsonOK, jsonError } from '@/lib/auth'
import { saveUpload } from '@/lib/storage'

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error
  const fd = await req.formData()
  let url: string | null = null
  try { url = await saveUpload(fd.get('avatar') as File | null, 'avatars') }
  catch (e: any) { return jsonError('upload_error', e.message, 400) }
  if (!url) return jsonError('missing', 'لم يتم اختيار صورة', 400)
  await sql`UPDATE members SET avatar = ${url}, updated_at = NOW() WHERE id = ${user.id}`
  return jsonOK({ avatar: url })
}

export async function DELETE() {
  const { user, error } = await requireUser()
  if (error) return error
  await sql`UPDATE members SET avatar = NULL, updated_at = NOW() WHERE id = ${user.id}`
  return jsonOK()
}
