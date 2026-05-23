import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TREASURY_ROLES, jsonOK, jsonError, parseJson, currentUser } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

/** GET /api/letters/[id] — full letter with recipients (creator or recipient may view) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return jsonError('unauthenticated', 'يرجى تسجيل الدخول', 401)
  const { id } = await params
  const letterId = Number(id)

  const [letter] = await sql`
    SELECT l.*, m.full_name AS created_by_name, m.signature AS created_by_signature
    FROM letters l
    LEFT JOIN members m ON m.id = l.created_by
    WHERE l.id = ${letterId}
  `
  if (!letter) return jsonError('not_found', 'الخطاب غير موجود', 404)

  // Authorization: creator or a recipient
  const isCreator = letter.created_by === user.id
  let myRecipient: any = null
  if (!isCreator) {
    const [r] = await sql`
      SELECT id, status, signature, used_stamp, viewed_at, approved_at, notes
      FROM letter_recipients
      WHERE letter_id = ${letterId} AND member_id = ${user.id}
    `
    if (!r) return jsonError('forbidden', 'لا تملك صلاحية الاطلاع', 403)
    myRecipient = r

    // Auto-mark viewed on first GET
    if (!myRecipient.viewed_at) {
      await sql`
        UPDATE letter_recipients
        SET status = CASE WHEN status = 'pending' THEN 'viewed' ELSE status END,
            viewed_at = NOW()
        WHERE id = ${myRecipient.id}
      `
      myRecipient.viewed_at = new Date().toISOString()
      if (myRecipient.status === 'pending') myRecipient.status = 'viewed'
    }
  }

  const recipients = await sql`
    SELECT lr.id, lr.member_id, lr.status, lr.signature, lr.used_stamp,
           lr.viewed_at, lr.approved_at, lr.notes,
           m.full_name, m.role
    FROM letter_recipients lr
    JOIN members m ON m.id = lr.member_id
    WHERE lr.letter_id = ${letterId}
    ORDER BY lr.approved_at NULLS LAST, m.full_name
  `

  return jsonOK({ letter, recipients, my_recipient: myRecipient, is_creator: isCreator })
}

/** PATCH — edit metadata. Only creator. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TREASURY_ROLES)
  if (error) return error
  const { id } = await params
  const body = await parseJson(req)
  if (!body) return jsonError('no_data', 'لا توجد بيانات', 400)

  const [own] = await sql`SELECT created_by FROM letters WHERE id = ${Number(id)}`
  if (!own) return jsonError('not_found', 'الخطاب غير موجود', 404)
  if (own.created_by !== user!.id && user!.role !== 'admin' && user!.role !== 'president')
    return jsonError('forbidden', 'لا تملك صلاحية التعديل', 403)

  await sql`
    UPDATE letters SET
      reference  = ${body.reference || null},
      date       = ${body.date || null},
      recipient  = ${body.recipient || null},
      subject    = ${body.subject || null},
      body       = ${body.body || ''},
      sign_name  = ${body.sign_name || null},
      sign_title = ${body.sign_title || null},
      show_stamp = ${!!body.show_stamp},
      updated_at = NOW()
    WHERE id = ${Number(id)}
  `
  return jsonOK()
}

/** DELETE — only creator (or admin/president). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(TREASURY_ROLES)
  if (error) return error
  const { id } = await params
  const [own] = await sql`SELECT created_by FROM letters WHERE id = ${Number(id)}`
  if (!own) return jsonError('not_found', 'الخطاب غير موجود', 404)
  if (own.created_by !== user!.id && user!.role !== 'admin' && user!.role !== 'president')
    return jsonError('forbidden', 'لا تملك صلاحية الحذف', 403)
  await sql`DELETE FROM letters WHERE id = ${Number(id)}`
  void log(user!.id, 'letter.delete', { ip: getIP(req), member_name: user!.full_name, details: { id } })
  return jsonOK()
}
