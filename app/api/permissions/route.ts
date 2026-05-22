import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, PERMISSION_DEFS, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

const VALID_PERMS = PERMISSION_DEFS.map(p => p.key)

/** GET /api/permissions?member_id=X — list individual permissions for a member */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error

  const member_id = Number(new URL(req.url).searchParams.get('member_id'))
  if (!member_id) return jsonError('missing', 'member_id مطلوب', 400)

  const rows = await sql<{ permission: string; granted_by_name: string | null; created_at: string }[]>`
    SELECT mp.permission, m.full_name AS granted_by_name, mp.created_at
    FROM member_permissions mp
    LEFT JOIN members m ON m.id = mp.granted_by
    WHERE mp.member_id = ${member_id}
    ORDER BY mp.created_at
  `
  return jsonOK({ permissions: rows })
}

/** POST /api/permissions — grant a permission { member_id, permission } */
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error

  const body = await parseJson(req)
  const { member_id, permission } = body

  if (!member_id || !permission) return jsonError('missing', 'member_id و permission مطلوبان', 400)
  if (!VALID_PERMS.includes(permission)) return jsonError('invalid', 'صلاحية غير معرّفة', 400)

  await sql`
    INSERT INTO member_permissions (member_id, permission, granted_by)
    VALUES (${Number(member_id)}, ${permission}, ${user!.id})
    ON CONFLICT (member_id, permission) DO NOTHING
  `
  void log(user!.id, 'permission.grant', {
    ip: getIP(req), member_name: user!.full_name,
    entity: 'member', entity_id: Number(member_id),
    details: { permission },
  })
  return jsonOK({ message: 'تم منح الصلاحية' })
}

/** DELETE /api/permissions — revoke { member_id, permission } */
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error

  const body = await parseJson(req)
  const { member_id, permission } = body

  if (!member_id || !permission) return jsonError('missing', 'member_id و permission مطلوبان', 400)

  await sql`
    DELETE FROM member_permissions
    WHERE member_id = ${Number(member_id)} AND permission = ${permission}
  `
  void log(user!.id, 'permission.revoke', {
    ip: getIP(req), member_name: user!.full_name,
    entity: 'member', entity_id: Number(member_id),
    details: { permission },
  })
  return jsonOK({ message: 'تم سحب الصلاحية' })
}
