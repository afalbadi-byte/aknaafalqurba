import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { sql } from './db'

const COOKIE     = 'akhnaf_session'
const LIFETIME_S = 14 * 24 * 60 * 60   // 14 days

export type Member = {
  id: number
  full_name: string
  phone: string
  email: string | null
  email_verified: boolean
  branch: string | null
  birth_year: number | null
  birth_date: string | null
  city: string | null
  address: string | null
  national_id: string | null
  avatar: string | null
  theme: 'light' | 'dark' | 'system'
  role: 'member' | 'aid_committee' | 'treasurer' | 'president' | 'admin'
  status: 'pending' | 'active' | 'suspended'
  notes: string | null
  created_at: string
  /** Individual permission grants (beyond role) */
  permissions: string[]
}

/** All defined individual permissions that can be granted per-user */
export const PERMISSION_DEFS = [
  { key: 'payment.review',  label: 'مراجعة الدفعات',     desc: 'اعتماد أو رفض الدفعات' },
  { key: 'expense.manage',  label: 'إدارة المصروفات',     desc: 'إضافة وحذف المصروفات' },
  { key: 'aid.review',      label: 'مراجعة المعونات',     desc: 'مراجعة طلبات المعونة وتغيير حالتها' },
  { key: 'news.publish',    label: 'نشر الأخبار',         desc: 'إضافة وتعديل وحذف الأخبار' },
  { key: 'report.view',     label: 'عرض التقارير',        desc: 'الوصول للتقارير المالية' },
  { key: 'member.view',     label: 'عرض قائمة الأعضاء',  desc: 'رؤية بيانات الأعضاء كاملة' },
] as const

export type PermissionKey = typeof PERMISSION_DEFS[number]['key']

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10)
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash)
}

export async function createSession(memberId: number, req?: NextRequest) {
  const token = randomBytes(32).toString('hex')
  const ip    = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const ua    = req?.headers.get('user-agent')?.slice(0, 255) || null
  const exp   = new Date(Date.now() + LIFETIME_S * 1000)
  await sql`
    INSERT INTO sessions (token, member_id, ip, user_agent, expires_at)
    VALUES (${token}, ${memberId}, ${ip}, ${ua}, ${exp})
  `
  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/',
    maxAge:   LIFETIME_S,
  })
  return token
}

export async function destroySession() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (token) await sql`DELETE FROM sessions WHERE token = ${token}`
  jar.delete(COOKIE)
}

/** Returns the current user or null. Never throws. */
export async function currentUser(): Promise<Member | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  const rows = await sql<Omit<Member, 'permissions'>[]>`
    SELECT m.id, m.full_name, m.phone, m.email, m.email_verified, m.branch,
           m.birth_year, m.birth_date, m.city, m.address, m.national_id,
           m.role, m.status, m.avatar, m.theme, m.notes, m.created_at
    FROM sessions s
    JOIN members  m ON m.id = s.member_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
    LIMIT 1
  `
  if (!rows[0]) return null
  // Load individual permissions (table may not exist before migration 009)
  let permissions: string[] = []
  try {
    const perms = await sql<{ permission: string }[]>`
      SELECT permission FROM member_permissions WHERE member_id = ${rows[0].id}
    `
    permissions = perms.map(p => p.permission)
  } catch { /* migration 009 not yet applied */ }
  return { ...rows[0], permissions }
}

/** Returns true if user has the given individual permission */
export function hasPerm(user: Member, permission: string): boolean {
  return user.permissions.includes(permission)
}

/** requireRole OR individual permission — combines both checks */
export async function requireRoleOrPerm(roles: Member['role'][], permission: string) {
  const { user, error } = await requireUser()
  if (error) return { user: null, error }
  if (roles.includes(user!.role) || hasPerm(user!, permission)) {
    return { user: user!, error: null as NextResponse | null }
  }
  return { user: null, error: jsonError('forbidden', 'لا تملك الصلاحية اللازمة', 403) }
}

/** Requires an authenticated user. Returns a NextResponse if not. */
export async function requireUser() {
  const u = await currentUser()
  if (!u) return { user: null, error: jsonError('unauthenticated', 'يرجى تسجيل الدخول', 401) }
  if (u.status !== 'active') return { user: null, error: jsonError('account_inactive', 'الحساب غير مفعّل', 403) }
  return { user: u, error: null as NextResponse | null }
}

/** Requires the user to be in one of the given roles. */
export async function requireRole(roles: Member['role'][]) {
  const { user, error } = await requireUser()
  if (error) return { user: null, error }
  if (!roles.includes(user.role)) {
    return { user: null, error: jsonError('forbidden', 'لا تملك الصلاحية اللازمة', 403) }
  }
  return { user, error: null as NextResponse | null }
}

export const COMMITTEE_ROLES: Member['role'][] = ['admin', 'president', 'treasurer', 'aid_committee']
export const TREASURY_ROLES:  Member['role'][] = ['admin', 'president', 'treasurer']
export const TOP_ADMIN_ROLES: Member['role'][] = ['admin', 'president']

export function isCommittee(u: Member) { return COMMITTEE_ROLES.includes(u.role) }
export function isAdmin(u: Member)     { return TOP_ADMIN_ROLES.includes(u.role) }

// ----------------- JSON response helpers -----------------
export function jsonOK<T extends object>(data: T = {} as T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status })
}
export function jsonError(code: string, message: string, status = 400, extra: object = {}) {
  return NextResponse.json({ ok: false, error: code, message, ...extra }, { status })
}

export async function parseJson(req: NextRequest): Promise<any> {
  try { return await req.json() } catch { return {} }
}

export function requireFields(input: Record<string, any>, fields: string[]) {
  for (const f of fields) {
    const v = input[f]
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      return jsonError('missing_field', `الحقل المطلوب: ${f}`, 400)
    }
  }
  return null
}
