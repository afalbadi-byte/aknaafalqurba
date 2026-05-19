import { sql } from './db'

export async function notify(
  member_id: number, type: string, title: string,
  body: string | null = null, link: string | null = null,
) {
  await sql`
    INSERT INTO notifications (member_id, type, title, body, link)
    VALUES (${member_id}, ${type}, ${title}, ${body}, ${link})
  `
}

export async function notifyCommittee(type: string, title: string, body: string | null = null, link: string | null = null) {
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM members
    WHERE role IN ('admin','president','treasurer','aid_committee')
      AND status = 'active'
  `
  await Promise.all(rows.map(r => notify(r.id, type, title, body, link)))
}
