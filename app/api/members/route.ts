import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, COMMITTEE_ROLES, jsonOK } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error

  const status = new URL(req.url).searchParams.get('status')

  // Try to include has_id_document (requires migration 011); fall back if column missing
  let rows: any[]
  try {
    rows = status
      ? await sql`
          SELECT id, full_name, national_id, phone, email, email_verified, branch, city,
                 role, status, avatar, created_at,
                 (id_document IS NOT NULL) AS has_id_document,
                 COALESCE(id_verified, false) AS id_verified
          FROM members WHERE status = ${status} ORDER BY created_at DESC
        `
      : await sql`
          SELECT id, full_name, national_id, phone, email, email_verified, branch, city,
                 role, status, avatar, created_at,
                 (id_document IS NOT NULL) AS has_id_document,
                 COALESCE(id_verified, false) AS id_verified
          FROM members ORDER BY created_at DESC
        `
  } catch {
    rows = status
      ? await sql`
          SELECT id, full_name, national_id, phone, email, email_verified, branch, city,
                 role, status, avatar, created_at
          FROM members WHERE status = ${status} ORDER BY created_at DESC
        `
      : await sql`
          SELECT id, full_name, national_id, phone, email, email_verified, branch, city,
                 role, status, avatar, created_at
          FROM members ORDER BY created_at DESC
        `
  }

  return jsonOK({ members: rows })
}
