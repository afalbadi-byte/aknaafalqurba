import { sql } from './db'
import { sendEmail } from './email'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://aknafalqurba.com'

/**
 * Records an in-app notification and (fire-and-forget) sends a matching
 * email if the member has one on file and SMTP is configured.
 */
export async function notify(
  member_id: number,
  type: string,
  title: string,
  body: string | null = null,
  link: string | null = null,
) {
  await sql`
    INSERT INTO notifications (member_id, type, title, body, link)
    VALUES (${member_id}, ${type}, ${title}, ${body}, ${link})
  `
  // Look up email + name; skip the email if member opted out or has none
  try {
    const [m] = await sql<{ email: string | null; full_name: string }[]>`
      SELECT email, full_name FROM members WHERE id = ${member_id}
    `
    if (m?.email) {
      const greeting = `مرحباً ${m.full_name}،`
      const html = `<p>${greeting}</p><p>${body || title}</p>`
      const cta  = link ? { label: 'فتح في المنصة', url: SITE + link } : undefined
      // Don't await — let it run in the background so the API stays snappy
      void sendEmail({ to: m.email, subject: title, body: html, cta })
    }
  } catch (e) {
    console.error('[notify] email lookup failed:', (e as Error).message)
  }
}

export async function notifyCommittee(
  type: string, title: string, body: string | null = null, link: string | null = null,
) {
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM members
    WHERE role IN ('admin','president','treasurer','aid_committee','secretary')
      AND status = 'active'
  `
  await Promise.all(rows.map(r => notify(r.id, type, title, body, link)))
}
