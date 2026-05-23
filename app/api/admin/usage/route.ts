import { sql } from '@/lib/db'
import { requireRole, TOP_ADMIN_ROLES, jsonOK } from '@/lib/auth'

/**
 * GET /api/admin/usage
 * Pulls real-time consumption metrics straight from the production DB.
 * No estimates, no fabricated numbers — only what we can actually observe.
 */
export async function GET() {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error

  // Database size + breakdown
  const [dbSize] = await sql<{ size_bytes: string; pretty: string }[]>`
    SELECT pg_database_size(current_database())::text AS size_bytes,
           pg_size_pretty(pg_database_size(current_database())) AS pretty
  `

  const tableSizes = await sql<{ table_name: string; total_bytes: string; pretty: string; row_estimate: number }[]>`
    SELECT c.relname AS table_name,
           pg_total_relation_size(c.oid)::text AS total_bytes,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS pretty,
           c.reltuples::bigint AS row_estimate
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 12
  `

  // Members (real counts)
  const [members] = await sql<{ total: number; active: number; pending: number; staff: number }[]>`
    SELECT
      COUNT(*)::int                                          AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int         AS active,
      COUNT(*) FILTER (WHERE status = 'pending')::int        AS pending,
      COUNT(*) FILTER (WHERE role <> 'member')::int          AS staff
    FROM members
  `

  // Files stored directly in the DB as base64 data URLs
  const [files] = await sql<{
    avatars_count: number; avatars_bytes: string;
    signatures_count: number; signatures_bytes: string;
    id_docs_count: number; id_docs_bytes: string;
  }[]>`
    SELECT
      COUNT(*) FILTER (WHERE avatar IS NOT NULL)::int                              AS avatars_count,
      COALESCE(SUM(LENGTH(avatar)) FILTER (WHERE avatar IS NOT NULL), 0)::text     AS avatars_bytes,
      COUNT(*) FILTER (WHERE signature IS NOT NULL)::int                           AS signatures_count,
      COALESCE(SUM(LENGTH(signature)) FILTER (WHERE signature IS NOT NULL), 0)::text AS signatures_bytes,
      COUNT(*) FILTER (WHERE id_document IS NOT NULL)::int                         AS id_docs_count,
      COALESCE(SUM(LENGTH(id_document)) FILTER (WHERE id_document IS NOT NULL), 0)::text AS id_docs_bytes
    FROM members
  `

  // Payment receipts stored as base64
  const [receipts] = await sql<{ count: number; bytes: string }[]>`
    SELECT
      COUNT(*) FILTER (WHERE receipt_path IS NOT NULL)::int                            AS count,
      COALESCE(SUM(LENGTH(receipt_path)) FILTER (WHERE receipt_path IS NOT NULL), 0)::text AS bytes
    FROM payments
  `

  // Payments activity (this month vs all time)
  const [payments] = await sql<{
    total: number; this_month: number; approved: number; pending: number;
    total_amount: string; this_month_amount: string;
  }[]>`
    SELECT
      COUNT(*)::int                                                                 AS total,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int        AS this_month,
      COUNT(*) FILTER (WHERE status = 'approved')::int                              AS approved,
      COUNT(*) FILTER (WHERE status = 'pending')::int                               AS pending,
      COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0)::text             AS total_amount,
      COALESCE(SUM(amount) FILTER (WHERE status = 'approved' AND created_at >= date_trunc('month', NOW())), 0)::text AS this_month_amount
    FROM payments
  `

  // Notifications (proxy for outgoing email volume — we send notifications via email/in-app)
  const [notifs] = await sql<{ total: number; this_month: number }[]>`
    SELECT
      COUNT(*)::int                                                          AS total,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS this_month
    FROM notifications
  `

  // Email verification codes (one per email send for verification)
  let emailVerifications = { total: 0, this_month: 0 }
  try {
    const [ev] = await sql<{ total: number; this_month: number }[]>`
      SELECT
        COUNT(*)::int                                                          AS total,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS this_month
      FROM email_verifications
    `
    emailVerifications = ev
  } catch {}

  // Letters
  let letters = { total: 0, this_month: 0, recipients: 0 }
  try {
    const [l] = await sql<{ total: number; this_month: number }[]>`
      SELECT
        COUNT(*)::int                                                          AS total,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS this_month
      FROM letters
    `
    const [r] = await sql<{ recipients: number }[]>`SELECT COUNT(*)::int AS recipients FROM letter_recipients`
    letters = { ...l, recipients: r.recipients }
  } catch {}

  // News + aid requests
  let news = 0, aid = 0
  try { const [n] = await sql<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM news`; news = n.c } catch {}
  try { const [a] = await sql<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM aid_requests`; aid = a.c } catch {}

  // Sessions (active = unexpired)
  const [sessions] = await sql<{ active: number; total: number }[]>`
    SELECT COUNT(*) FILTER (WHERE expires_at > NOW())::int AS active,
           COUNT(*)::int                                   AS total
    FROM sessions
  `

  // Inferred external service status from env vars (booleans only, never the values)
  const envInfo = {
    database_url:       !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL,
    anthropic_api:      !!process.env.ANTHROPIC_API_KEY,
    resend_api:         !!process.env.RESEND_API_KEY,
    smtp_configured:    !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    payment_gateway:    !!process.env.PAYMENT_API_KEY,
    vercel_blob:        !!process.env.BLOB_READ_WRITE_TOKEN,
    public_site_url:    process.env.NEXT_PUBLIC_SITE_URL || null,
  }

  return jsonOK({
    db:        { size_bytes: dbSize.size_bytes, pretty: dbSize.pretty, tables: tableSizes },
    members,
    files: {
      avatars:    { count: files.avatars_count,    bytes: files.avatars_bytes },
      signatures: { count: files.signatures_count, bytes: files.signatures_bytes },
      id_docs:    { count: files.id_docs_count,    bytes: files.id_docs_bytes },
      receipts:   { count: receipts.count,         bytes: receipts.bytes },
    },
    payments,
    notifications: notifs,
    email_verifications: emailVerifications,
    letters,
    news_count: news,
    aid_requests_count: aid,
    sessions,
    services_configured: envInfo,
    generated_at: new Date().toISOString(),
  })
}
