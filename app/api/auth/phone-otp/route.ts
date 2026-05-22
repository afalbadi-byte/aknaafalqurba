import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { startPhoneVerification, checkPhoneCode } from '@/lib/phone-verification'
import { log, getIP } from '@/lib/log'

/**
 * POST /api/auth/phone-otp
 * Send a 6-digit OTP to the current member's registered phone number.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  if (!user.phone)
    return jsonError('no_phone', 'لم يتم تسجيل رقم جوال لحسابك', 400)

  const result = await startPhoneVerification(user.id, user.phone, 'verify')
  if (!result.ok)
    return jsonError('otp_cooldown', `انتظر ${result.cooldown_seconds} ثانية قبل إعادة الإرسال`, 429)

  void log(user.id, 'phone.otp_sent', { ip: getIP(req), member_name: user.full_name })
  return jsonOK({ sent: true })
}

/**
 * PUT /api/auth/phone-otp  { code }
 * Verify the OTP and mark phone_verified = true.
 */
export async function PUT(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await parseJson(req)
  if (!body?.code)
    return jsonError('missing_field', 'الرمز مطلوب', 400)

  const result = await checkPhoneCode(user.id, String(body.code), 'verify')
  if (!result.ok)
    return jsonError('invalid_otp', result.reason || 'الرمز غير صحيح', 401)

  await sql`
    UPDATE members SET phone_verified = TRUE, updated_at = NOW() WHERE id = ${user.id}
  `

  void log(user.id, 'phone.verified', { ip: getIP(req), member_name: user.full_name })
  return jsonOK({ verified: true })
}
