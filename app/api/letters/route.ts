import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TREASURY_ROLES, COMMITTEE_ROLES, jsonOK, jsonError, parseJson, currentUser, hasPerm } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

/**
 * GET /api/letters?box=outgoing|incoming|all
 *   - outgoing: letters I drafted
 *   - incoming: letters where I'm a recipient
 *   - all:      everything I have access to (committee only)
 */
export async function GET(req: NextRequest) {
  const user = await currentUser()
  if (!user) return jsonError('unauthenticated', 'يرجى تسجيل الدخول', 401)

  const box = new URL(req.url).searchParams.get('box') || 'outgoing'

  if (box === 'incoming') {
    const rows = await sql`
      SELECT l.*, m.full_name AS created_by_name,
             lr.id AS my_recipient_id, lr.status AS my_status,
             lr.viewed_at AS my_viewed_at, lr.approved_at AS my_approved_at
      FROM letter_recipients lr
      JOIN letters l ON l.id = lr.letter_id
      LEFT JOIN members m ON m.id = l.created_by
      WHERE lr.member_id = ${user.id}
      ORDER BY l.created_at DESC
      LIMIT 200
    `
    return jsonOK({ letters: rows })
  }

  // outgoing / all — must be committee
  if (!COMMITTEE_ROLES.includes(user.role)) {
    return jsonError('forbidden', 'صلاحيات اللجنة مطلوبة', 403)
  }

  if (box === 'all') {
    const rows = await sql`
      SELECT l.*, m.full_name AS created_by_name
      FROM letters l
      LEFT JOIN members m ON m.id = l.created_by
      ORDER BY l.created_at DESC
      LIMIT 200
    `
    return jsonOK({ letters: rows })
  }

  // default: outgoing = letters I created
  const rows = await sql`
    SELECT l.*, m.full_name AS created_by_name,
           (SELECT COUNT(*)::int FROM letter_recipients WHERE letter_id = l.id) AS recipients_count,
           (SELECT COUNT(*)::int FROM letter_recipients WHERE letter_id = l.id AND status = 'approved') AS approved_count
    FROM letters l
    LEFT JOIN members m ON m.id = l.created_by
    WHERE l.created_by = ${user.id}
    ORDER BY l.created_at DESC
    LIMIT 200
  `
  return jsonOK({ letters: rows })
}

/**
 * POST /api/letters
 *   body: {
 *     reference, date, recipient, subject, body, sign_name, sign_title,
 *     show_stamp:   bool   - drafter's stamp toggle (must hold letter.stamp perm)
 *     drafter_signature: data-URL of the drafter's signature snapshot (optional)
 *     recipient_ids: number[]  - members to notify; empty = no notifications
 *   }
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(TREASURY_ROLES)
  if (error) return error
  const body = await parseJson(req)
  if (!body) return jsonError('no_data', 'لا توجد بيانات', 400)

  const wantsStamp = !!body.show_stamp
  const stampOK = canUseStamp(user!)
  const useStamp = wantsStamp && stampOK

  const [letter] = await sql`
    INSERT INTO letters (
      reference, date, recipient, subject, body,
      sign_name, sign_title, show_stamp, created_by,
      drafter_signature, drafter_used_stamp
    )
    VALUES (
      ${body.reference || null},
      ${body.date || null},
      ${body.recipient || null},
      ${body.subject || null},
      ${body.body || ''},
      ${body.sign_name || null},
      ${body.sign_title || null},
      ${useStamp},
      ${user!.id},
      ${body.drafter_signature || null},
      ${useStamp}
    )
    RETURNING *
  `

  // Recipients
  const rawIds: number[] = Array.isArray(body.recipient_ids)
    ? body.recipient_ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0 && n !== user!.id)
    : []
  const recipientIds: number[] = Array.from(new Set<number>(rawIds))

  if (recipientIds.length > 0) {
    // Insert recipients
    for (const rid of recipientIds) {
      const rId: number = rid
      await sql`
        INSERT INTO letter_recipients (letter_id, member_id)
        VALUES (${letter.id}, ${rId})
        ON CONFLICT (letter_id, member_id) DO NOTHING
      `
    }
    // Notifications
    const title = body.subject ? `خطاب جديد للاطلاع: ${body.subject}` : 'خطاب جديد للاطلاع'
    const fromText = `من ${user!.full_name}`
    const link = `/admin/letters?inbox=${letter.id}`
    for (const rid of recipientIds) {
      const rId: number = rid
      await sql`
        INSERT INTO notifications (member_id, type, title, body, link)
        VALUES (${rId}, 'letter.received', ${title}, ${fromText}, ${link})
      `
    }
  }

  void log(user!.id, 'letter.create', {
    ip: getIP(req), member_name: user!.full_name,
    details: { subject: body.subject, recipients: recipientIds.length, stamp: useStamp },
  })
  return jsonOK({ letter, recipient_ids: recipientIds })
}

function canUseStamp(u: any): boolean {
  if (!u) return false
  if (u.role === 'admin' || u.role === 'president') return true
  return hasPerm(u, 'letter.stamp')
}
