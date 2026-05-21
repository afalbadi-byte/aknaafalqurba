/**
 * POST /api/migrate
 * Applies all pending DB migrations idempotently.
 * Requires an active admin/president session OR the MIGRATE_SECRET env variable.
 *
 * Usage:
 *   curl -X POST https://your-app.vercel.app/api/migrate \
 *        -H "x-migrate-secret: <MIGRATE_SECRET>"
 *
 *   Or log in as admin and POST from the browser / Postman.
 */
import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { currentUser, jsonOK, jsonError } from '@/lib/auth'

const MIGRATIONS: { name: string; up: string }[] = [
  {
    name: '002-email-verification',
    up: `
      ALTER TABLE members
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS email_verifications (
        id          SERIAL PRIMARY KEY,
        member_id   INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        email       VARCHAR(150) NOT NULL,
        code_hash   VARCHAR(120) NOT NULL,
        purpose     VARCHAR(30)  NOT NULL DEFAULT 'register',
        attempts    SMALLINT     NOT NULL DEFAULT 0,
        expires_at  TIMESTAMPTZ  NOT NULL,
        used_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_email_ver_member ON email_verifications(member_id);
      CREATE INDEX IF NOT EXISTS idx_email_ver_active ON email_verifications(member_id, used_at, expires_at);
    `,
  },
  {
    name: '003-profile-enhancements',
    up: `
      ALTER TABLE members ADD COLUMN IF NOT EXISTS birth_date DATE;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'system';
      CREATE INDEX IF NOT EXISTS idx_members_natid ON members(national_id) WHERE national_id IS NOT NULL;
      UPDATE members
        SET birth_date = make_date(birth_year, 1, 1)
        WHERE birth_year IS NOT NULL AND birth_date IS NULL;
    `,
  },
]

export async function GET() {
  // Quick health check — returns which migrations exist without running anything
  const results = await Promise.all(
    MIGRATIONS.map(async m => {
      try {
        // Probe: if the migration's sentinel column/table exists the migration ran
        if (m.name.startsWith('002')) {
          await sql`SELECT email_verified FROM members LIMIT 0`
          return { name: m.name, status: 'applied' }
        }
        if (m.name.startsWith('003')) {
          await sql`SELECT theme FROM members LIMIT 0`
          return { name: m.name, status: 'applied' }
        }
        return { name: m.name, status: 'unknown' }
      } catch {
        return { name: m.name, status: 'pending' }
      }
    })
  )
  return jsonOK({ migrations: results })
}

export async function POST(req: NextRequest) {
  // Auth: either a valid MIGRATE_SECRET header or an admin session
  const secret = req.headers.get('x-migrate-secret')
  const envSecret = process.env.MIGRATE_SECRET

  if (envSecret && secret === envSecret) {
    // secret-based auth — proceed
  } else {
    const user = await currentUser()
    if (!user) return jsonError('unauthenticated', 'يرجى تسجيل الدخول', 401)
    if (!['admin', 'president'].includes(user.role))
      return jsonError('forbidden', 'صلاحيات المدير مطلوبة', 403)
  }

  const applied: string[] = []
  const skipped: string[] = []
  const errors:  { name: string; error: string }[] = []

  for (const m of MIGRATIONS) {
    try {
      /**
       * postgres.js extended-query protocol (the default) does NOT support
       * multiple commands in one call — that triggers:
       *   "cannot insert multiple commands into a prepared statement"
       *
       * Fix: pass { simple: true } to force the simple-query wire protocol,
       * which PostgreSQL DOES support for multi-statement strings.
       * All our migration SQL uses IF NOT EXISTS so it's fully idempotent.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sql as any).unsafe(m.up, [], { simple: true })
      applied.push(m.name)
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (msg.includes('already exists') || msg.includes('duplicate column')) {
        skipped.push(m.name)
      } else {
        errors.push({ name: m.name, error: msg })
      }
    }
  }

  const appliedUniq = applied

  if (errors.length) {
    return jsonError('migration_error', 'بعض المهاجرات فشلت', 500, { applied: appliedUniq, skipped, errors })
  }
  return jsonOK({ message: 'تم تطبيق المهاجرات بنجاح', applied: appliedUniq, skipped })
}
