import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, jsonOK, jsonError } from '@/lib/auth'

const MAX_BYTES = 150 * 1024

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const fd = await req.formData()
  const file = fd.get('signature') as File | null
  if (!file || file.size === 0) return jsonError('missing', 'لم يتم اختيار صورة', 400)

  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext))
    return jsonError('bad_type', 'صيغة غير مدعومة — jpg/png/webp فقط', 400)

  if (file.size > MAX_BYTES)
    return jsonError('too_large', 'الصورة كبيرة جداً — الحد ١٥٠KB', 400)

  const buf = await file.arrayBuffer()
  const dataUrl = `data:${file.type};base64,${Buffer.from(buf).toString('base64')}`

  await sql`UPDATE members SET signature = ${dataUrl}, updated_at = NOW() WHERE id = ${user!.id}`
  return jsonOK({ signature: dataUrl })
}

export async function DELETE() {
  const { user, error } = await requireUser()
  if (error) return error
  await sql`UPDATE members SET signature = NULL, updated_at = NOW() WHERE id = ${user!.id}`
  return jsonOK()
}
