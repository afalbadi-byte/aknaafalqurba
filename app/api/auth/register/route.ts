import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { notifyCommittee } from '@/lib/notify'

export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  const err  = requireFields(body, ['full_name', 'phone', 'password'])
  if (err) return err

  const phone = String(body.phone).replace(/[^0-9+]/g, '')
  if (phone.length < 9) return jsonError('bad_phone', 'رقم الجوال غير صحيح', 400)
  if (String(body.password).length < 6) return jsonError('weak_password', 'كلمة المرور قصيرة (٦ أحرف على الأقل)', 400)

  const taken = await sql`SELECT id FROM members WHERE phone = ${phone}`
  if (taken.length) return jsonError('phone_in_use', 'رقم الجوال مسجّل بالفعل', 409)

  if (body.email) {
    const e = await sql`SELECT id FROM members WHERE email = ${body.email}`
    if (e.length) return jsonError('email_in_use', 'البريد الإلكتروني مسجّل بالفعل', 409)
  }

  const hash = await hashPassword(body.password)
  const [ins] = await sql<{ id: number }[]>`
    INSERT INTO members (full_name, national_id, phone, email, branch, birth_year, city, address, password_hash, role, status)
    VALUES (
      ${String(body.full_name).trim()},
      ${body.national_id || null},
      ${phone},
      ${body.email || null},
      ${body.branch || null},
      ${body.birth_year ? Number(body.birth_year) : null},
      ${body.city || null},
      ${body.address || null},
      ${hash},
      'member',
      'pending'
    )
    RETURNING id
  `
  await notifyCommittee('new_member', 'طلب عضوية جديد',
    `${body.full_name} يطلب الانضمام للصندوق`, `/admin/members?id=${ins.id}`)

  return jsonOK({
    member_id: ins.id,
    message: 'تم استلام طلبك. سيتم تفعيل الحساب بعد مراجعة لجنة الصندوق.',
  })
}
