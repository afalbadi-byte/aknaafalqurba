import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { sql } from '@/lib/db'
import { jsonOK, jsonError, parseJson, createSession } from '@/lib/auth'
import { normalisePhone } from '@/lib/whatsapp'
import { log, getIP } from '@/lib/log'

const MAX_ATTEMPTS = 5

/**
 * POST /api/auth/whatsapp/verify
 *   body: { phone: string, code: string, purpose?: string }
 *
 * Checks the OTP. On success creates a session if a member exists for
 * this phone (purpose='login'). For 'register' / 'verify' purposes,
 * just marks the code as used and returns ok so the caller can proceed
 * with their own flow (e.g. finish registration form, mark identity
 * verified, etc.).
 */
export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  if (!body?.phone || !body?.code) return jsonError('missing', 'رقم الجوال والرمز مطلوبان', 400)

  const phone = normalisePhone(body.phone)
  const code  = String(body.code).replace(/\D/g, '').slice(0, 6)
  const purpose = (body.purpose || 'login').toString().slice(0, 30)
  if (!phone || phone.length < 11) return jsonError('invalid_phone', 'رقم جوال غير صالح', 400)
  if (code.length !== 6)            return jsonError('invalid_code',  'الرمز يجب أن يكون ٦ أرقام', 400)

  const codeHash = createHash('sha256').update(code).digest('hex')

  const [row] = await sql<any[]>`
    SELECT id, code_hash, attempts, expires_at, used_at, member_id, purpose
    FROM phone_otp
    WHERE phone = ${phone}
      AND used_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `
  if (!row) return jsonError('expired', 'انتهت صلاحية الرمز أو لم يُرسل', 400)
  if (row.attempts >= MAX_ATTEMPTS) {
    return jsonError('locked', 'تجاوزت عدد المحاولات — اطلب رمزاً جديداً', 429)
  }
  if (row.code_hash !== codeHash) {
    await sql`UPDATE phone_otp SET attempts = attempts + 1 WHERE id = ${row.id}`
    return jsonError('wrong_code', 'الرمز غير صحيح', 400)
  }

  // Mark used
  await sql`UPDATE phone_otp SET used_at = NOW() WHERE id = ${row.id}`

  // For login: find member, create session
  if (purpose === 'login') {
    const [member] = await sql<any[]>`
      SELECT id, full_name, status FROM members WHERE phone = ${phone} LIMIT 1
    `
    if (!member) return jsonError('no_member', 'لا يوجد حساب لهذا الرقم', 404)
    if (member.status !== 'active')
      return jsonError('inactive', 'الحساب غير مفعّل بعد', 403)
    await createSession(member.id, req)
    void log(member.id, 'whatsapp.otp.login', { ip: getIP(req), member_name: member.full_name })
    return jsonOK({ message: 'تم تسجيل الدخول', member_id: member.id })
  }

  void log(row.member_id ?? null, 'whatsapp.otp.verify', {
    ip: getIP(req), details: { purpose },
  })

  return jsonOK({ message: 'تم التحقق', verified: true, member_id: row.member_id })
}
