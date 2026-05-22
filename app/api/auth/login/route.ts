import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { verifyPassword, createSession, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  const err  = requireFields(body, ['identifier', 'password'])
  if (err) return err

  const ident = String(body.identifier).trim()
  const ip = getIP(req)
  // Look up by phone, email, OR the ID document field — whichever the user typed
  const rows  = await sql`
    SELECT * FROM members
    WHERE phone = ${ident} OR email = ${ident} OR national_id = ${ident}
    LIMIT 1
  `
  const m = rows[0]
  if (!m || !(await verifyPassword(body.password, m.password_hash))) {
    void log(m?.id ?? null, 'auth.login_failed', { ip, member_name: m?.full_name ?? null, details: { identifier: ident } })
    return jsonError('bad_credentials', 'بيانات الدخول غير صحيحة', 401)
  }

  if (m.status === 'pending')   return jsonError('account_pending',   'حسابك بانتظار تفعيل لجنة الصندوق', 403)
  if (m.status === 'suspended') return jsonError('account_suspended', 'الحساب موقوف. تواصل مع الإدارة',  403)

  await createSession(m.id, req)
  void log(m.id, 'auth.login', { ip, member_name: m.full_name, details: { role: m.role } })
  const { password_hash, ...user } = m
  return jsonOK({ user })
}
