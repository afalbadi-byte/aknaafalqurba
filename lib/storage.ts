/**
 * File upload helper — stores files as base64 data URLs directly in the DB.
 * No external storage service required.
 * Supported: jpg, jpeg, png, webp, gif, pdf — max 5 MB
 */
export async function saveUpload(
  file: File | null | undefined,
  _prefix: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf']
  if (!allowed.includes(ext)) throw new Error('صيغة الملف غير مدعومة (jpg, png, pdf فقط)')
  if (file.size > 5 * 1024 * 1024) throw new Error('الحد الأقصى لحجم الملف ٥ ميجابايت')
  const buf = await file.arrayBuffer()
  const b64 = Buffer.from(buf).toString('base64')
  return `data:${file.type};base64,${b64}`
}
