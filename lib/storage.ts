import { put } from '@vercel/blob'

/**
 * Upload a file to Vercel Blob storage and return the public URL.
 * Returns null if no file given.
 */
export async function saveUpload(file: File | null, prefix: string): Promise<string | null> {
  if (!file || file.size === 0) return null
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf']
  if (!allowed.includes(ext)) throw new Error('صيغة الملف غير مدعومة')
  if (file.size > 5 * 1024 * 1024) throw new Error('الحد الأقصى ٥ ميجابايت')
  const name = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  const { url } = await put(name, file, { access: 'public', addRandomSuffix: false })
  return url
}
