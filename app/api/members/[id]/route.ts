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
    SELECT id, full_name, national_id, phone, email, email_verified,
           branch, birth_year, birth_date, city, address,
           role, status, avatar, notes, created_at, updated_at,
           gender, generation_number,
           COALESCE(id_verified, false) AS id_verified, id_verified_at,
           (id_document IS NOT NULL) AS has_id_document,
           (signature IS NOT NULL)   AS has_signature
    FROM members WHERE id = ${id}
  `
  if (!row) return jsonError('not_found', 'العضو غير موجود', 404)
  if (id !== user.id && !isAdmin(user)) {
    delete row.national_id; delete row.address
  }

  // Detail counts (only for admin/committee viewing others, or self)
  const dependents = await sql`
    SELECT id, full_name, relation, birth_date, national_id
    FROM family_dependents WHERE member_id = ${id} ORDER BY created_at
  `
  const [payStats] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_count,
      COUNT(*) FILTER (WHERE status = 'pending')::int  AS pending_count,
      COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0)::numeric AS approved_total
    FROM payments WHERE member_id = ${id}
  `
  const [aidStats] = await sql`
    SELECT
      COUNT(*)::int AS total_count,
      COUNT(*) FILTER (WHERE status IN ('approved', 'disbursed'))::int AS approved_count
    FROM aid_requests WHERE member_id = ${id}
  `

  return jsonOK({
    member: row,
    dependents,
    stats: {
      payments_approved: payStats.approved_count,
      payments_pending:  payStats.pending_count,
      payments_total:    Number(payStats.approved_total),
      aid_total:         aidStats.total_count,
      aid_approved:      aidStats.approved_count,
    },
  })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser()
  if (error) return error
  if (!isAdmin(user)) return jsonError('forbidden', 'صلاحيات المدير مطلوبة', 403)

  const id = Number((await ctx.params).id)
  if (id === user.id) return jsonError('forbidden', 'لا يمكنك حذف حسابك الخاص', 403)

  const [m] = await sql`SELECT id, full_name, role FROM members WHERE id = ${id}`
  if (!m) return jsonError('not_found', 'العضو غير موجود', 404)

  // Reassign news & expenses authored by this member to the deleting admin
  // (author_id / created_by are NOT NULL with RESTRICT — can't null them out)
  await sql`UPDATE news     SET author_id  = ${user.id} WHERE author_id  = ${id}`
  await sql`UPDATE expenses SET created_by = ${user.id} WHERE created_by = ${id}`

  // Delete member — ON DELETE CASCADE handles:
  //   sessions, notifications, email_verifications, family_dependents,
  //   member_permissions, payments, aid_requests, aid_updates
  await sql`DELETE FROM members WHERE id = ${id}`

  void log(user.id, 'member.deleted', {
    ip: getIP(req),
    member_name: user.full_name,
    details: { deleted_id: id, deleted_name: m.full_name },
  })

  return jsonOK({ message: `تم حذف ${m.full_name} وجميع بياناته` })
}
