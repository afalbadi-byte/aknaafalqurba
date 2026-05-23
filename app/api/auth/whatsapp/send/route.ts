import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { sql } from '@/lib/db'
import { jsonOK, jsonError, parseJson } from '@/lib/auth'
import { sendWhatsappOTP, generateOTP, normalisePhone } from '@/lib/whatsapp'
import { log, getIP } from '@/lib/log'

const OTP_TTL_MIN = 10
const RESEND_COOLDOWN_S = 60

/**
 * POST /api/auth/whatsapp/send
 *   body: { phone: string, purpose?: 'login' | 'register' | 'verify' }
 *
 * Generates a 6-digit OTP, stores its SHA-256 hash with a 10-min TTL,
 * and dispatches it through the WhatsApp Cloud API authentication
 * template. Rate-limited to 1 send/60s per phone.
 */
export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  if (!body?.phone) return jsonError('missing', 'رقم الجوال مطلوب', 400)

  const phone = normalisePhone(body.phone)
  if (phone.length < 11) return jsonError('invalid_phone', 'رقم جوال غير صالح', 400)

  const purpose = (body.purpose || 'login').toString().slice(0, 30)

  // Rate-limit: refuse another send if the last unexpired send is < 60s old
  const [recent] = await sql<{ created_at: string }[]>`
    SELECT created_at FROM phone_otp
    WHERE phone = ${phone}
      AND created_at > NOW() - INTERVAL '${RESEND_COOLDOWN_S} seconds'
    ORDER BY created_at DESC
    LIMIT 1
  `
  if (recent) {
    const ageS = (Date.now() - new Date(recent.created_at).getTime()) / 1000
    const wait = Math.max(1, Math.ceil(RESEND_COOLDOWN_S - ageS))
    return jsonError('rate_limited', `يرجى الانتظار ${wait} ثانية قبل طلب رمز جديد`, 429)
  }

  // Find member (if exists) so we can attach the OTP to them
  const [member] = await sql<{ id: number }[]>`
    SELECT id FROM members WHERE phone = ${phone} LIMIT 1
  `

  // Generate + hash the code
  const code = generateOTP()
  const codeHash = createHash('sha256').update(code).digest('hex')

  // Mark any previous unused codes for this phone as expired
  await sql`
    UPDATE phone_otp
    SET used_at = NOW()
    WHERE phone = ${phone} AND used_at IS NULL
  `

  // Store the new code
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000)
  await sql`
    INSERT INTO phone_otp (phone, code_hash, channel, purpose, member_id, expires_at, ip)
    VALUES (${phone}, ${codeHash}, 'whatsapp', ${purpose}, ${member?.id ?? null}, ${expiresAt}, ${getIP(req)})
  `

  // Dispatch via WhatsApp
  const res = await sendWhatsappOTP(phone, code)
  if (!res.ok) {
    return jsonError('whatsapp_failed', (res as any).error || 'فشل إرسال الرسالة', 502)
  }

  void log(member?.id ?? null, 'whatsapp.otp.send', {
    ip: getIP(req),
    details: { phone: phone.slice(0, 6) + '****', purpose, member_known: !!member },
  })

  return jsonOK({
    message: 'تم إرسال رمز التحقق إلى واتساب',
    expires_in: OTP_TTL_MIN * 60,
    member_known: !!member,
  })
}
