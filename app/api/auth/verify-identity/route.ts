/**
 * POST /api/auth/verify-identity  { member_id, id_document }
 * Public endpoint — no auth required.
 * Runs AI verification on the uploaded Tawakkalna document.
 * On success: updates member profile with authoritative ID data + marks id_verified.
 */
import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { verifyIdDocument } from '@/lib/ai-verify'
import { checkAndActivate } from '@/lib/activation'
import { log, getIP } from '@/lib/log'

export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  const fe   = requireFields(body, ['member_id', 'id_document'])
  if (fe) return fe

  const memberId = Number(body.member_id)

  // Load member
  const [m] = await sql<{ id: number; full_name: string; national_id: string | null; status: string }[]>`
    SELECT id, full_name, national_id, status FROM members WHERE id = ${memberId}
  `
  if (!m) return jsonError('not_found', 'العضو غير موجود', 404)
  if (m.status === 'suspended') return jsonError('suspended', 'الحساب موقوف، تواصل مع الإدارة', 403)
  if (m.status === 'active')   return jsonOK({ already_active: true, message: 'حسابك مفعّل بالفعل' })

  const idDocument = String(body.id_document)

  // Save document (best-effort — migration 011)
  try {
    await sql`UPDATE members SET id_document = ${idDocument} WHERE id = ${memberId}`
  } catch { /* migration not applied yet */ }

  // ── AI verification ──────────────────────────────────────
  const aiResult = await verifyIdDocument({
    full_name:   m.full_name,
    national_id: m.national_id,
    id_document: idDocument,
  })

  if (!aiResult) {
    void log(memberId, 'identity.verify_ai_unavailable', { ip: getIP(req), member_name: m.full_name })
    return jsonError(
      'ai_unavailable',
      'خدمة التحقق الذكي غير متاحة حالياً. سيتم مراجعة طلبك يدوياً من قبل الإدارة.',
      503,
    )
  }

  void log(memberId, 'identity.verify_attempt', {
    ip: getIP(req),
    member_name: m.full_name,
    details: {
      verified:    aiResult.verified,
      is_badi:     aiResult.is_badi,
      id_matches:  aiResult.id_matches,
      extracted:   { name: aiResult.extracted_name, id: aiResult.extracted_id },
    },
  })

  if (!aiResult.verified) {
    const reason = !aiResult.is_badi
      ? 'الاسم لا ينتمي لعائلة البادي'
      : 'رقم الهوية في الوثيقة لا يتطابق مع المُدخل'
    return jsonOK({
      verified: false,
      message:  `لم يتم التحقق — ${reason}. تأكد من رفع صورة واضحة لهويتك من توكلنا.`,
    })
  }

  // ── Verification passed — update profile with authoritative ID data ──
  const profileUpdates: Record<string, any> = {}
  if (aiResult.extracted_name)       profileUpdates.full_name   = aiResult.extracted_name
  if (aiResult.extracted_id)         profileUpdates.national_id = aiResult.extracted_id
  if (aiResult.extracted_birth_date) {
    profileUpdates.birth_date = aiResult.extracted_birth_date
    profileUpdates.birth_year = Number(aiResult.extracted_birth_date.slice(0, 4))
  }
  if (aiResult.extracted_gender)     profileUpdates.gender = aiResult.extracted_gender

  if (Object.keys(profileUpdates).length > 0) {
    try {
      await sql`UPDATE members SET ${sql(profileUpdates)}, updated_at = NOW() WHERE id = ${memberId}`
    } catch (e: any) {
      // Unique constraint on national_id — already used by another member
      if (String(e?.message).includes('national_id')) {
        return jsonError('national_id_in_use', 'رقم الهوية المستخرج مسجّل لدى عضو آخر — تواصل مع الإدارة', 409)
      }
      console.error('[verify-identity] profile update error:', e.message)
      // Don't block verification just because profile update failed
    }
  }

  // ── Mark as ID-verified ──
  try {
    await sql`
      UPDATE members SET id_verified = true, id_verified_at = NOW()
      WHERE id = ${memberId}
    `
  } catch { /* migration 012 not applied yet */ }

  void log(memberId, 'identity.verified_and_updated', {
    ip: getIP(req),
    member_name: m.full_name,
    details: { updated_fields: Object.keys(profileUpdates) },
  })

  // ── Check full activation (both email + id verified) ──
  const activated = await checkAndActivate(memberId)

  return jsonOK({
    verified:         true,
    activated,
    updated_fields:   Object.keys(profileUpdates),
    message:          activated ? 'تم التحقق وتفعيل حسابك' : 'تم التحقق من هويتك',
  })
}
