import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK, jsonError } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { log, getIP } from '@/lib/log'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error

  const id = Number((await ctx.params).id)
  if (!id) return jsonError('invalid_id', 'معرف العضو غير صحيح', 400)

  const rows = await sql<{ email: string | null }[]>`SELECT email FROM members WHERE id = ${id}`
  if (!rows.length) return jsonError('not_found', 'العضو غير موجود', 404)
  if (!rows[0].email) return jsonError('no_email', 'لا يوجد بريد إلكتروني لهذا العضو', 400)

  await sql`UPDATE members SET email_verified = TRUE, updated_at = NOW() WHERE id = ${id}`
  void log(user!.id, 'member.email_verify_admin', { ip: getIP(req), member_name: user!.full_name, entity: 'member', entity_id: id })
  await notify(id, 'email_verified', 'تم تفعيل بريدك الإلكتروني', 'تم التحقق من بريدك الإلكتروني بواسطة المدير', '/profile')

  return jsonOK({ message: 'تم تفعيل البريد الإلكتروني بنجاح' })
}
