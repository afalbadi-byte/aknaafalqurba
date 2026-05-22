import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, isCommittee, isAdmin, jsonOK, jsonError } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser()
  if (error) return error

  const id = Number((await ctx.params).id)
  if (id !== user.id && !isCommittee(user)) return jsonError('forbidden', 'لا تملك الصلاحية', 403)

  const [row] = await sql`
    SELECT id, full_name, national_id, phone, email, branch, birth_year, city,
           address, role, status, avatar, notes, created_at
    FROM members WHERE id = ${id}
  `
  if (!row) return jsonError('not_found', 'العضو غير موجود', 404)
  if (id !== user.id && !isAdmin(user)) {
    delete row.national_id; delete row.address
  }
  return jsonOK({ member: row })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser()
  if (error) return error
  if (!isAdmin(user)) return jsonError('forbidden', 'صلاحيات المدير مطلوبة', 403)

  const id = Number((await ctx.params).id)
  if (id === user.id) return jsonError('forbidden', 'لا يمكنك حذف حسابك الخاص', 403)

  const [m] = await sql`SELECT id, full_name, role FROM members WHERE id = ${id}`
  if (!m) return jsonError('not_found', 'العضو غير موجود', 404)

  // Null-out FK references that don't have CASCADE
  await sql`UPDATE payments    SET member_id = NULL WHERE member_id = ${id}`
  await sql`UPDATE aid_requests SET member_id = NULL WHERE member_id = ${id}`
  try { await sql`DELETE FROM notifications WHERE member_id = ${id}` } catch {}

  // Delete member — CASCADE handles: email_verifications, family_dependents, member_permissions
  await sql`DELETE FROM members WHERE id = ${id}`

  void log(user.id, 'member.deleted', {
    ip: getIP(req),
    member_name: user.full_name,
    details: { deleted_id: id, deleted_name: m.full_name },
  })

  return jsonOK({ message: `تم حذف ${m.full_name} وجميع بياناته` })
}
