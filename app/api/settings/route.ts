import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, TREASURY_ROLES, TOP_ADMIN_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'

export async function GET() {
  const { error } = await requireRole(TREASURY_ROLES)
  if (error) return error
  const rows = await sql<{ key_name: string; key_value: string }[]>`
    SELECT key_name, key_value FROM settings
  `
  const out: Record<string, string> = {}
  for (const r of rows) out[r.key_name] = r.key_value
  return jsonOK({ settings: out })
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const body = await parseJson(req)
  if (!body || typeof body !== 'object') return jsonError('no_data', 'لا توجد بيانات', 400)

  for (const [k, v] of Object.entries(body)) {
    if (!/^[a-z0-9_]+$/i.test(k)) continue
    await sql`
      INSERT INTO settings (key_name, key_value)
      VALUES (${k}, ${String(v)})
      ON CONFLICT (key_name) DO UPDATE SET key_value = EXCLUDED.key_value
    `
  }
  return jsonOK()
}
