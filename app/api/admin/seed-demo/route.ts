import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, hashPassword, jsonOK, jsonError, parseJson } from '@/lib/auth'

/**
 * POST /api/admin/seed-demo
 *   body: { phone: string, password: string, full_name?: string, role?: string }
 *
 * Creates (or resets) a demo account with the given phone + password
 * pair, marked as active so it can log in immediately. No email
 * required. Top-admin only.
 */
export async function POST(req: NextRequest) {
  // One-shot bootstrap: if no users exist yet OR MIGRATE_SECRET header matches,
  // allow without session. Otherwise require top-admin role.
  const headerSecret = req.headers.get('x-seed-secret')
  const envSecret    = process.env.MIGRATE_SECRET
  const bypassByHeader = envSecret && headerSecret === envSecret

  if (!bypassByHeader) {
    const { error } = await requireRole(TOP_ADMIN_ROLES)
    if (error) return error
  }

  const body = await parseJson(req)
  if (!body?.phone || !body?.password)
    return jsonError('missing', 'الجوال وكلمة السر مطلوبان', 400)

  const phone     = String(body.phone).trim()
  const fullName  = body.full_name || 'مستخدم تجربة'
  const role      = body.role || 'admin'
  const passwordHash = await hashPassword(String(body.password))

  // Upsert: if a user with this phone already exists, reset their password
  // and re-arm them as the requested role + active.
  const [existing] = await sql<{ id: number }[]>`
    SELECT id FROM members WHERE phone = ${phone} LIMIT 1
  `

  if (existing) {
    await sql`
      UPDATE members
      SET password_hash = ${passwordHash},
          full_name     = ${fullName},
          role          = ${role}::member_role,
          status        = 'active',
          updated_at    = NOW()
      WHERE id = ${existing.id}
    `
    return jsonOK({ id: existing.id, reset: true, phone, role })
  }

  const [created] = await sql<{ id: number }[]>`
    INSERT INTO members (full_name, phone, password_hash, role, status, email_verified)
    VALUES (${fullName}, ${phone}, ${passwordHash}, ${role}::member_role, 'active', true)
    RETURNING id
  `
  return jsonOK({ id: created.id, created: true, phone, role })
}
