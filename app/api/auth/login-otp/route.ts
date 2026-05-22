import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { createSession, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { checkCode, startVerification } from '@/lib/verification'
import { log, getIP } from '@/lib/log'

/** POST /api/auth/login-otp  { member_id, code } → creates session */
export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  const err  = requireFields(body, ['member_id', 'code'])
  if (err) return err

  const memberId = Number(body.member_id)
  const ip       = getIP(req)

  // Load member
  const [m] = await sql`SELECT * FROM members WHERE id = ${memberId} LIMIT 1`
  if (!m) return jsonError('not_found', 'الحساب غير موجود', 404)
  if (m.status !== 'active') return jsonError('account_inactive', 'الحساب غير مفعّل', 403)

  // Verify OTP
  const result = await checkCode(memberId, String(body.code), 'login_otp')
  if (!result.ok) {
    void log(memberId, 'auth.login_otp_failed', { ip, member_name: m.full_name, details: { reason: result.reason } })
    return jsonError('invalid_otp', result.reason || 'رمز التحقق غير صحيح', 401)
  }

  // Create session
  await createSession(memberId, req)
  void log(memberId, 'auth.login', { ip, member_name: m.full_name, details: { role: m.role } })

  const { password_hash, ...user } = m
  return jsonOK({ user })
}

/** POST /api/auth/login-otp/resend  { member_id } → resends OTP */
export async function PUT(req: NextRequest) {
  const body = await parseJson(req)
  if (!body.member_id) return jsonError('missing_field', 'member_id مطلوب', 400)

  const memberId = Number(body.member_id)
  const [m] = await sql`SELECT id, email, full_name FROM members WHERE id = ${memberId} LIMIT 1`
  if (!m || !m.email) return jsonError('not_found', 'الحساب غير موجود أو لا يوجد بريد إلكتروني', 404)

  const otp = await startVerification(memberId, m.email, 'login_otp')
  if (!otp.ok && otp.cooldown_seconds) {
    return jsonError('otp_cooldown', `انتظر ${otp.cooldown_seconds} ثانية`, 429)
  }
  return jsonOK({ resent: true })
}
