/**
 * POST /api/auth/verify-id  { member_id }
 * Admin/committee triggers AI verification of a member's uploaded ID document.
 * On success: overwrites member profile with authoritative data from the ID.
 */
import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, COMMITTEE_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { verifyIdDocument } from '@/lib/ai-verify'
import { log, getIP } from '@/lib/log'

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error

  const body = await parseJson(req)
  if (!body.member_id) return jsonError('missing_field', 'member_id مطلوب', 400)

  const memberId = Number(body.member_id)

  // Load member + id_document
  let member: any
  try {
    const [row] = await sql`
      SELECT id, full_name, national_id, id_document FROM members WHERE id = ${memberId}
    `
    member = row
  } catch {
    return jsonError('migration_pending', 'تطبيق migration 011 مطلوب أولاً', 503)
  }

  if (!member)           return jsonError('not_found',    'العضو غير موجود',         404)
  if (!member.id_document) return jsonError('no_document', 'لم يرفع العضو صورة هوية', 400)

  // ── Call AI ──────────────────────────────────────────────────────────────
  const result = await verifyIdDocument({
    full_name:   member.full_name,
    national_id: member.national_id,
    id_document: member.id_document,
  })

  if (!result) {
    return jsonError('ai_unavailable', 'خدمة التحقق الذكي غير متاحة (تحقق من ANTHROPIC_API_KEY)', 503)
  }

  // ── Persist result ────────────────────────────────────────────────────────
  const updatedFields: string[] = []

  try {
    if (result.verified) {
      // Build profile update from authoritative ID data
      const profileUpdates: Record<string, any> = {
        id_verified:    true,
        id_verified_at: new Date().toISOString(),
        status:         'active',
      }
      if (result.extracted_name) {
        profileUpdates.full_name = result.extracted_name
        updatedFields.push('full_name')
      }
      if (result.extracted_id) {
        profileUpdates.national_id = result.extracted_id
        updatedFields.push('national_id')
      }
      if (result.extracted_birth_date) {
        profileUpdates.birth_date = result.extracted_birth_date
        profileUpdates.birth_year = Number(result.extracted_birth_date.slice(0, 4))
        updatedFields.push('birth_date')
      }
      if (result.extracted_gender) {
        profileUpdates.gender = result.extracted_gender
        updatedFields.push('gender')
      }

      try {
        await sql`UPDATE members SET ${sql(profileUpdates)}, updated_at = NOW() WHERE id = ${memberId}`
      } catch (e2: any) {
        if (String(e2?.message).includes('national_id')) {
          // national_id conflict — activate without overwriting it
          const { national_id: _nid, ...withoutNid } = profileUpdates
          updatedFields.splice(updatedFields.indexOf('national_id'), 1)
          await sql`UPDATE members SET ${sql(withoutNid)}, updated_at = NOW() WHERE id = ${memberId}`
        } else {
          throw e2
        }
      }
    } else {
      await sql`UPDATE members SET id_verified = false WHERE id = ${memberId}`
    }
  } catch { /* migration 012 pending — ignore */ }

  void log(user!.id, 'admin.id_verify', {
    member_name: user!.full_name,
    entity: 'member', entity_id: memberId,
    details: {
      verified:       result.verified,
      is_badi:        result.is_badi,
      id_matches:     result.id_matches,
      updated_fields: updatedFields,
    },
  })

  return jsonOK({ result, updated_fields: updatedFields })
}
