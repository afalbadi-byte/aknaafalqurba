import { sql } from '@/lib/db'
import { requireRole, TREASURY_ROLES, jsonOK } from '@/lib/auth'

/**
 * GET /api/members/staff
 * Returns active staff members (non-ordinary members) — used as the pool of
 * possible recipients in the letter editor.
 */
export async function GET() {
  const { error } = await requireRole(TREASURY_ROLES)
  if (error) return error

  const rows = await sql`
    SELECT id, full_name, role, avatar
    FROM members
    WHERE role <> 'member' AND status = 'active'
    ORDER BY
      CASE role
        WHEN 'admin'         THEN 1
        WHEN 'president'     THEN 2
        WHEN 'secretary'     THEN 3
        WHEN 'treasurer'     THEN 4
        WHEN 'aid_committee' THEN 5
        ELSE 6
      END,
      full_name
  `
  return jsonOK({ staff: rows })
}
