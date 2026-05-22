/**
 * Checks if a member has completed both verifications and activates their account.
 * Called after each verification step (email or identity).
 */
import { sql } from './db'

export async function checkAndActivate(memberId: number): Promise<boolean> {
  try {
    // Try to read the new columns; fall back gracefully if migration pending
    let emailVerified = false
    let idVerified    = false

    try {
      const [m] = await sql<{ email: string | null; email_verified: boolean; id_verified: boolean }[]>`
        SELECT email, email_verified, id_verified FROM members WHERE id = ${memberId}
      `
      if (!m) return false
      emailVerified = !!m.email_verified
      idVerified    = !!m.id_verified
    } catch {
      // Migration 012 not yet applied — only check email
      const [m] = await sql<{ email: string | null; email_verified: boolean }[]>`
        SELECT email, email_verified FROM members WHERE id = ${memberId}
      `
      if (!m) return false
      emailVerified = !!m.email_verified
      idVerified    = false
    }

    if (emailVerified && idVerified) {
      await sql`
        UPDATE members SET status = 'active'
        WHERE id = ${memberId} AND status = 'pending'
      `
      return true
    }
    return false
  } catch {
    return false
  }
}
