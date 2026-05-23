import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { currentUser, hasPerm, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

/**
 * POST /api/letters/[id]/approve
 * Recipient marks the letter as approved, optionally with a signature snapshot
 * and a stamp (only if they hold letter.stamp or are admin/president).
 *
 * body: { signature?: data-URL, use_stamp?: bool, notes?: string }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return jsonError('unauthenticated', 'يرجى تسجيل الدخول', 401)
  const { id } = await params
  const letterId = Number(id)

  const body = await parseJson(req) || {}

  const [r] = await sql`
    SELECT id FROM letter_recipients
    WHERE letter_id = ${letterId} AND member_id = ${user.id}
  `
  if (!r) return jsonError('forbidden', 'لست من مستلمي هذا الخطاب', 403)

  // Stamp permission gate
  const wantsStamp = !!body.use_stamp
  const canStamp = user.role === 'admin' || user.role === 'president' || hasPerm(user, 'letter.stamp')
  const useStamp = wantsStamp && canStamp

  await sql`
    UPDATE letter_recipients
    SET status      = 'approved',
        signature   = ${body.signature || null},
        used_stamp  = ${useStamp},
        notes       = ${body.notes || null},
        approved_at = NOW(),
        viewed_at   = COALESCE(viewed_at, NOW())
    WHERE id = ${r.id}
  `

  // Notify the drafter
  const [letter] = await sql`SELECT created_by, subject FROM letters WHERE id = ${letterId}`
  if (letter?.created_by && letter.created_by !== user.id) {
    await sql`
      INSERT INTO notifications (member_id, type, title, body, link)
      VALUES (
        ${letter.created_by},
        'letter.approved',
        ${`اعتمد ${user.full_name} الخطاب`},
        ${letter.subject || ''},
        ${`/admin/letters?id=${letterId}`}
      )
    `
  }

  void log(user.id, 'letter.approve', {
    ip: getIP(req), member_name: user.full_name,
    entity: 'letter', entity_id: letterId,
    details: { stamp: useStamp },
  })

  return jsonOK({ message: 'تم اعتماد الخطاب' })
}
