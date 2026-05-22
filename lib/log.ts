/**
 * Activity logger — fire-and-forget.
 * Inserts a row into activity_logs without ever throwing or blocking the caller.
 */
import { sql } from './db'
import type { NextRequest } from 'next/server'

export async function log(
  member_id: number | null,
  action: string,
  opts: {
    entity?:      string | null
    entity_id?:   number | null
    details?:     Record<string, any> | null
    ip?:          string | null
    member_name?: string | null
  } = {}
): Promise<void> {
  try {
    await sql`
      INSERT INTO activity_logs
        (member_id, member_name, action, entity, entity_id, details, ip)
      VALUES (
        ${member_id ?? null},
        ${opts.member_name ?? null},
        ${action},
        ${opts.entity ?? null},
        ${opts.entity_id ?? null},
        ${opts.details ? JSON.stringify(opts.details) : null},
        ${opts.ip ?? null}
      )
    `
  } catch (e) {
    // Logging must never crash the main request
    console.error('[activity-log] insert failed:', (e as Error).message)
  }
}

/** Extract real client IP from the request headers */
export function getIP(req: NextRequest): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
