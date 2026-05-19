import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'

// One-time installer: creates the first admin if no admin/president exists.
// After running once, this route becomes a no-op (returns admin_exists).
export async function GET() {
  const [admin] = await sql`SELECT id FROM members WHERE role IN ('admin','president') LIMIT 1`
  return jsonOK({ admin_exists: !!admin })
}

export async function POST(req: NextRequest) {
  const [admin] = await sql`SELECT id FROM members WHERE role IN ('admin','president') LIMIT 1`
  if (admin) return jsonError('already_installed', 'تم تثبيت النظام مسبقاً', 409)

  const body = await parseJson(req)
  const fe = requireFields(body, ['full_name', 'phone', 'password'])
  if (fe) return fe
  if (String(body.password).length < 6) return jsonError('weak_password', 'كلمة المرور قصيرة', 400)

  const phone = String(body.phone).replace(/[^0-9+]/g, '')
  const hash  = await hashPassword(body.password)

  await sql`
    INSERT INTO members (full_name, phone, email, password_hash, role, status)
    VALUES (
      ${String(body.full_name).trim()},
      ${phone},
      ${body.email || null},
      ${hash},
      'admin',
      'active'
    )
  `
  return jsonOK({ message: 'تم إنشاء حساب المدير. يمكنك تسجيل الدخول الآن.' })
}
