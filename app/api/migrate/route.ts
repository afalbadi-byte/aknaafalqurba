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
    name: '012-id-verified',
    up: `
      ALTER TABLE members ADD COLUMN IF NOT EXISTS id_verified     BOOLEAN     NOT NULL DEFAULT FALSE;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS id_verified_at  TIMESTAMPTZ;
    `,
  },
  {
    name: '013-dependent-birth-date',
    up: `ALTER TABLE family_dependents ADD COLUMN IF NOT EXISTS birth_date DATE;`,
  },
  {
    name: '014-dependent-national-id',
    up: `ALTER TABLE family_dependents ADD COLUMN IF NOT EXISTS national_id VARCHAR(10);`,
  },
  {
    name: '015-members-national-id-unique',
    up: `CREATE UNIQUE INDEX IF NOT EXISTS idx_members_national_id_unique
         ON members(national_id) WHERE national_id IS NOT NULL;`,
  },
  {
    name: '017-payments-ai-extracted',
    up: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS ai_extracted JSONB;`,
  },
  {
    name: '018-member-role-secretary',
    up: `ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'secretary';`,
  },
  {
    name: '019-letter-templates',
    up: `
      CREATE TABLE IF NOT EXISTS letter_templates (
        id         SERIAL PRIMARY KEY,
        category   VARCHAR(80)  NOT NULL DEFAULT 'إدارية عامة',
        title      VARCHAR(200) NOT NULL,
        subject    VARCHAR(200) NOT NULL DEFAULT '',
        body       TEXT         NOT NULL DEFAULT '',
        created_by INT          REFERENCES members(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_letter_templates_cat ON letter_templates(category);
    `,
  },
  {
    name: '020-letters',
    up: `
      CREATE TABLE IF NOT EXISTS letters (
        id          SERIAL PRIMARY KEY,
        reference   VARCHAR(100),
        date        VARCHAR(50),
        recipient   VARCHAR(200),
        subject     VARCHAR(500),
        body        TEXT NOT NULL DEFAULT '',
        sign_name   VARCHAR(150),
        sign_title  VARCHAR(150),
        show_stamp  BOOLEAN NOT NULL DEFAULT FALSE,
        created_by  INT REFERENCES members(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_letters_created_by ON letters(created_by);
      CREATE INDEX IF NOT EXISTS idx_letters_created_at ON letters(created_at DESC);
    `,
  },
  {
    name: '021-member-signature',
    up: `ALTER TABLE members ADD COLUMN IF NOT EXISTS signature TEXT;`,
  },
  {
    name: '024-clear-seeded-costs',
    up: `
      -- Wipe the initial defaults seeded by migration 023.
      -- The admin will enter actual subscription costs manually based on
      -- real invoices, and usage stats are fetched live from the DB.
      DELETE FROM platform_costs WHERE service_name IN (
        'استضافة Vercel',
        'قاعدة البيانات (Neon / Vercel Postgres)',
        'بريد Resend',
        'Anthropic API (Claude)',
        'Vercel Blob (تخزين الملفات)',
        'بوابة الدفع Moyasar',
        'نطاق aknaafalqurba.com'
      );
    `,
  },
  {
    name: '023-platform-costs',
    up: `
      CREATE TABLE IF NOT EXISTS platform_costs (
        id            SERIAL PRIMARY KEY,
        service_name  VARCHAR(120) NOT NULL,
        plan          VARCHAR(120),
        category      VARCHAR(40)  NOT NULL DEFAULT 'other',
        monthly_cost  NUMERIC(10,2) NOT NULL DEFAULT 0,
        currency      CHAR(3) NOT NULL DEFAULT 'SAR',
        notes         TEXT,
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order    INT NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_platform_costs_active ON platform_costs(is_active);

      INSERT INTO platform_costs (service_name, plan, category, monthly_cost, notes, sort_order)
      SELECT * FROM (VALUES
        ('استضافة Vercel',               'Hobby (مجانية)',              'hosting',  0,    '100GB تدفق شهرياً + serverless مجانية حتى حد معين، كافية لحجم الاستخدام الحالي', 10),
        ('قاعدة البيانات (Neon / Vercel Postgres)', 'Free',           'database', 0,    '0.5GB تخزين + ساعة حساب مجانية، تكفي للعدد الحالي من الأعضاء', 20),
        ('بريد Resend',                  'Free',                        'email',    0,    '3000 رسالة/شهر و100 رسالة/يوم — كافية لإشعارات تفعيل الحساب', 30),
        ('Anthropic API (Claude)',       'Pay-as-go',                   'ai',       19,   'نحو 5 دولار/شهر للتحقق الذكي من بطاقات الهوية واستخراج البيانات', 40),
        ('Vercel Blob (تخزين الملفات)',  'حسب الاستخدام',               'storage',  11,   '0.15$ لكل GB تخزين + 0.03$ لكل GB تنزيل — للصور والوثائق الكبيرة', 50),
        ('بوابة الدفع Moyasar',          '2.85% + 1 ر.س لكل عملية',     'payment',  0,    'لا توجد رسوم شهرية ثابتة، رسوم متغيرة مع كل معاملة فقط', 60),
        ('نطاق aknaafalqurba.com',       'سنوي ~60 ر.س',                'domain',   5,    'تجديد سنوي للنطاق (دومين .com)', 70)
      ) AS v(service_name, plan, category, monthly_cost, notes, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM platform_costs LIMIT 1);
    `,
  },
  {
    name: '022-letter-recipients',
    up: `
      ALTER TABLE letters ADD COLUMN IF NOT EXISTS drafter_signature TEXT;
      ALTER TABLE letters ADD COLUMN IF NOT EXISTS drafter_used_stamp BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS letter_recipients (
        id          SERIAL PRIMARY KEY,
        letter_id   INT NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
        member_id   INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        status      VARCHAR(20) NOT NULL DEFAULT 'pending',
        signature   TEXT,
        used_stamp  BOOLEAN NOT NULL DEFAULT FALSE,
        viewed_at   TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        notes       TEXT,
        UNIQUE(letter_id, member_id)
      );
      CREATE INDEX IF NOT EXISTS idx_letter_recipients_letter ON letter_recipients(letter_id);
      CREATE INDEX IF NOT EXISTS idx_letter_recipients_member ON letter_recipients(member_id);
    `,
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
        if (m.name.startsWith('012')) {
          const [col] = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'members' AND column_name = 'id_verified'
          `
          return { name: m.name, status: col ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('013')) {
          const [col] = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'family_dependents' AND column_name = 'birth_date'
          `
          return { name: m.name, status: col ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('014')) {
          const [col] = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'family_dependents' AND column_name = 'national_id'
          `
          return { name: m.name, status: col ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('015')) {
          const [idx] = await sql`
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'members' AND indexname = 'idx_members_national_id_unique'
          `
          return { name: m.name, status: idx ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('017')) {
          const [col] = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'payments' AND column_name = 'ai_extracted'
          `
          return { name: m.name, status: col ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('018')) {
          const [val] = await sql`
            SELECT enumlabel FROM pg_enum
            JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
            WHERE pg_type.typname = 'member_role' AND enumlabel = 'secretary'
          `
          return { name: m.name, status: val ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('019')) {
          const [tbl] = await sql`
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'letter_templates'
          `
          return { name: m.name, status: tbl ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('008')) {
          const [tbl] = await sql`
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'activity_logs'
          `
          return { name: m.name, status: tbl ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('020')) {
          const [tbl] = await sql`
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'letters'
          `
          return { name: m.name, status: tbl ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('021')) {
          const [col] = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'members' AND column_name = 'signature'
          `
          return { name: m.name, status: col ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('022')) {
          const [tbl] = await sql`
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'letter_recipients'
          `
          return { name: m.name, status: tbl ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('023')) {
          const [tbl] = await sql`
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'platform_costs'
          `
          return { name: m.name, status: tbl ? 'applied' : 'pending' }
        }
        if (m.name.startsWith('024')) {
          // One-shot cleanup migration — mark "applied" if the seeded
          // defaults are no longer present.
          const [row] = await sql`
            SELECT COUNT(*)::int AS n FROM platform_costs
            WHERE service_name IN ('استضافة Vercel', 'بريد Resend', 'نطاق aknaafalqurba.com')
          `
          return { name: m.name, status: row && row.n === 0 ? 'applied' : 'pending' }
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
