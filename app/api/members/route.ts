import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, COMMITTEE_ROLES, jsonOK } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { user, error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error

  const status = new URL(req.url).searchParams.get('status')
  const rows = status
    ? await sql`
        SELECT id, full_name, phone, email, branch, city, role, status, created_at
        FROM members WHERE status = ${status} ORDER BY created_at DESC
      `
    : await sql`
        SELECT id, full_name, phone, email, branch, city, role, status, created_at
        FROM members ORDER BY created_at DESC
      `
  return jsonOK({ members: rows })
}
