import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, requireRole, COMMITTEE_ROLES, jsonOK, jsonError } from '@/lib/auth'
import { notifyCommittee } from '@/lib/notify'
import { saveUpload } from '@/lib/storage'
import { log, getIP } from '@/lib/log'

// GET: list (committee)
export async function GET(req: NextRequest) {
  const { error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error
  const status = new URL(req.url).searchParams.get('status')
  const rows = status
    ? await sql`
        SELECT a.*, m.full_name AS member_name, m.phone AS member_phone, m.branch AS member_branch,
               r.full_name AS reviewer_name
        FROM aid_requests a
        JOIN members m  ON m.id = a.member_id
        LEFT JOIN members r ON r.id = a.reviewed_by
        WHERE a.status = ${status}
        ORDER BY a.created_at DESC LIMIT 500
      `
    : await sql`
        SELECT a.*, m.full_name AS member_name, m.phone AS member_phone, m.branch AS member_branch,
               r.full_name AS reviewer_name
        FROM aid_requests a
        JOIN members m  ON m.id = a.member_id
        LEFT JOIN members r ON r.id = a.reviewed_by
        ORDER BY a.created_at DESC LIMIT 500
      `
  return jsonOK({ requests: rows })
}

// POST: create (any logged-in member)
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const fd = await req.formData()
  if (!fd.get('aid_type') || !fd.get('title') || !fd.get('description'))
    return jsonError('missing_field', 'بيانات ناقصة', 400)

  let attachment: string | null = null
  try { attachment = await saveUpload(fd.get('attachment') as File | null, 'aid') }
  catch (e: any) { return jsonError('upload_error', e.message, 400) }

  const [ins] = await sql<{ id: number }[]>`
    INSERT INTO aid_requests
      (member_id, aid_type, requested_amount, title, description,
       dependents_count, monthly_income, attachment, status, confidential)
    VALUES (
      ${user.id},
      ${String(fd.get('aid_type'))},
      ${fd.get('requested_amount') ? Number(fd.get('requested_amount')) : null},
      ${String(fd.get('title')).trim()},
      ${String(fd.get('description')).trim()},
      ${fd.get('dependents_count') ? Number(fd.get('dependents_count')) : null},
      ${fd.get('monthly_income')   ? Number(fd.get('monthly_income'))   : null},
      ${attachment},
      'submitted',
      ${fd.get('confidential') === '0' ? false : true}
    )
    RETURNING id
  `
  await notifyCommittee('new_aid', 'طلب دعم جديد',
    `${user.full_name} - ${fd.get('title')}`, `/admin/aid?id=${ins.id}`)

  void log(user.id, 'aid.create', { ip: getIP(req), member_name: user.full_name, entity: 'aid', entity_id: ins.id, details: { aid_type: String(fd.get('aid_type')), requested_amount: fd.get('requested_amount') ? Number(fd.get('requested_amount')) : null } })
  return jsonOK({ id: ins.id })
}
