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
  {
    name: '004-avatar-text',
    up: `
      ALTER TABLE members ALTER COLUMN avatar TYPE TEXT;
    `,
  },
  {
    name: '005-receipt-text',
    up: `
      ALTER TABLE payments ALTER COLUMN receipt_path TYPE TEXT;
    `,
  },
  {
    name: '006-expense-attachment-text',
    up: `
      ALTER TABLE expenses ALTER COLUMN attachment TYPE TEXT;
      ALTER TABLE aid_requests ALTER COLUMN attachment TYPE TEXT;
    `,
  },
  {
    name: '007-payments-review-columns',
    up: `
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS reviewed_by     INT REFERENCES members(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS reviewed_at     TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS reviewer_notes  TEXT,
        ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `,
  },
  {
    name: '009-member-permissions',
    up: `
      CREATE TABLE IF NOT EXISTS member_permissions (
        id          SERIAL PRIMARY KEY,
        member_id   INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        permission  VARCHAR(80) NOT NULL,
        granted_by  INT REFERENCES members(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(member_id, permission)
      );
      CREATE INDEX IF NOT EXISTS idx_mperms_member ON member_permissions(member_id);
    `,
  },
  {
    name: '010-gender-generation',
    up: `
      ALTER TABLE members ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
      ALTER TABLE members ADD COLUMN IF NOT EXISTS generation_number SMALLINT;
    `,
  },
  {
    name: '011-id-document',
    up: `ALTER TABLE members ADD COLUMN IF NOT EXISTS id_document TEXT;`,
  },
  {
    name: '008-activity-logs',
    up: `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id          BIGSERIAL PRIMARY KEY,
        member_id   INT REFERENCES members(id) ON DELETE SET NULL,
        member_name VARCHAR(150),
        action      VARCHAR(80)  NOT NULL,
        entity      VARCHAR(40),
        entity_id   INT,
        details     TEXT,
        ip          VARCHAR(45),
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_logs_member  ON activity_logs(member_id);
      CREATE INDEX IF NOT EXISTS idx_logs_action  ON activity_logs(action);
      CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at DESC);
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
        if (m.name.startsWith('004')) {
          const [col] = await sql`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'members' AND column_name = 'avatar'
          `
          return { name: m.name, status: col?.data_type === 'text' ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('005')) {
          const [col] = await sql`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'payments' AND column_name = 'receipt_path'
          `
          return { name: m.name, status: col?.data_type === 'text' ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('006')) {
          const [col] = await sql`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'expenses' AND column_name = 'attachment'
          `
          return { name: m.name, status: col?.data_type === 'text' ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('007')) {
          const [col] = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'payments' AND column_name = 'reviewed_by'
          `
          return { name: m.name, status: col ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('010')) {
          const [col] = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'members' AND column_name = 'gender'
          `
          return { name: m.name, status: col ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('009')) {
          const [tbl] = await sql`
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'member_permissions'
          `
          return { name: m.name, status: tbl ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('011')) {
          const [col] = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'members' AND column_name = 'id_document'
          `
          return { name: m.name, status: col ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('008')) {
          const [tbl] = await sql`
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'activity_logs'
          `
          return { name: m.name, status: tbl ? 'applied' : 'pending' }
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
  return jsonOK({ message: 'تم تطبيق المهاجرات بنجاح', applied: appliedUniq, skipped, errors: [] })
}
