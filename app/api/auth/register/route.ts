import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { notifyCommittee } from '@/lib/notify'
import { startVerification } from '@/lib/verification'
import { log, getIP } from '@/lib/log'
import { verifyIdDocument } from '@/lib/ai-verify'

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

  // Derive birth_year from birth_date if provided
  const birthDate = body.birth_date ? String(body.birth_date).slice(0, 10) : null
  const birthYear = birthDate
    ? Number(birthDate.slice(0, 4))
    : (body.birth_year ? Number(body.birth_year) : null)

  const hash = await hashPassword(body.password)
  const [ins] = await sql<{ id: number }[]>`
    INSERT INTO members (full_name, national_id, phone, email, branch, birth_year, birth_date, city, address, password_hash, role, status, gender, generation_number)
    VALUES (
      ${String(body.full_name).trim()},
      ${body.national_id || null},
      ${phone},
      ${body.email || null},
      ${body.branch || null},
      ${birthYear},
      ${birthDate},
      ${body.city || null},
      ${body.address || null},
      ${hash},
      'member',
      'pending',
      ${body.gender || null},
      ${body.generation_number ? Number(body.generation_number) : null}
    )
    RETURNING id
  `
  // Store id_document — requires migration 011
  let aiVerified = false
  if (body.id_document) {
    try {
      await sql`UPDATE members SET id_document = ${String(body.id_document)} WHERE id = ${ins.id}`

      // ── AI verification: auto-activate if البادي confirmed ──────────────
      const aiResult = await verifyIdDocument({
        full_name:   String(body.full_name).trim(),
        national_id: body.national_id || null,
        id_document: String(body.id_document),
      })
      if (aiResult?.verified) {
        await sql`
          UPDATE members
          SET id_verified = true, id_verified_at = NOW(), status = 'active'
          WHERE id = ${ins.id}
        `
        aiVerified = true
      }
    } catch (e) {
      console.error('[register] id_document/AI error:', (e as Error).message)
    }
  }

  void log(ins.id, 'auth.register', { ip: getIP(req), member_name: String(body.full_name).trim(), entity: 'member', entity_id: ins.id, details: { phone, email: body.email || null, ai_verified: aiVerified } })
  await notifyCommittee('new_member', aiVerified ? 'عضو جديد (تحقق ذكي ✓)' : 'طلب عضوية جديد',
    `${body.full_name} ${aiVerified ? 'تم التحقق من هويته آلياً وتفعيل عضويته' : 'يطلب الانضمام للصندوق'}`,
    `/admin/members?id=${ins.id}`)

  // Email verification code
  let email_pending = false
  if (body.email) {
    try {
      await startVerification(ins.id, body.email, 'register')
      email_pending = true
    } catch (e) {
      console.error('[register] verification email failed:', (e as Error).message)
    }
  }

  return jsonOK({
    member_id:   ins.id,
    email_pending,
    ai_verified: aiVerified,
    message: aiVerified
      ? 'تم التحقق من هويتك آلياً وتفعيل عضويتك! يمكنك الدخول الآن.'
      : (email_pending
          ? 'تم استلام طلبك وأرسلنا رمز تأكيد إلى بريدك. سيتم تفعيل الحساب بعد مراجعة اللجنة.'
          : 'تم استلام طلبك. سيتم تفعيل الحساب بعد مراجعة لجنة الصندوق.'),
  })
}
