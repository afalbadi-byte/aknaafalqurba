/**
 * POST /api/members/family-register  { document }
 *   → Calls Claude AI to extract family members from a Tawakkalna سجل الأسرة
 *   → Returns { members: ExtractedMember[] } for user review (does NOT save yet)
 *
 * PUT /api/members/family-register  { members: ExtractedMember[] }
 *   → Saves the confirmed/edited list to family_dependents
 *   → Returns { saved: number }
 */
import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, jsonOK, jsonError, parseJson, requireFields } from '@/lib/auth'
import { extractFamilyRegister, ExtractedMember } from '@/lib/ai-family'
import { log, getIP } from '@/lib/log'

/* ─── EXTRACT (preview) ─── */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await parseJson(req)
  const fe   = requireFields(body, ['document'])
  if (fe) return fe

  const members = await extractFamilyRegister(String(body.document))

  if (members === null) {
    return jsonError(
      'ai_unavailable',
      'خدمة الاستخراج الذكي غير متاحة حالياً. يمكنك إضافة أفراد عائلتك يدوياً.',
      503,
    )
  }

  void log(user.id, 'family.register_extracted', {
    ip:          getIP(req),
    member_name: user.full_name,
    details:     { count: members.length },
  })

  return jsonOK({ members })
}

/* ─── SAVE (confirmed list) ─── */
export async function PUT(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await parseJson(req)
  if (!Array.isArray(body.members) || body.members.length === 0)
    return jsonError('bad_request', 'لا يوجد أفراد لحفظهم', 400)

  const members = body.members as ExtractedMember[]
  let saved = 0

  for (const m of members) {
    if (!m.full_name?.trim() || !m.relation) continue

    const birthDate  = m.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(m.birth_date) ? m.birth_date : null
    const birthYear  = birthDate ? Number(birthDate.slice(0, 4)) : null
    const nationalId = m.national_id?.replace(/\D/g, '').slice(0, 10) || null

    try {
      await sql`
        INSERT INTO family_dependents (member_id, full_name, relation, birth_date, birth_year, national_id)
        VALUES (${user.id}, ${m.full_name.trim()}, ${m.relation}, ${birthDate}, ${birthYear}, ${nationalId})
      `
    } catch {
      // Fallback: migrations 013/014 not yet applied
      await sql`
        INSERT INTO family_dependents (member_id, full_name, relation, birth_year)
        VALUES (${user.id}, ${m.full_name.trim()}, ${m.relation}, ${birthYear})
      `
    }
    saved++
  }

  void log(user.id, 'family.register_saved', {
    ip:          getIP(req),
    member_name: user.full_name,
    details:     { saved },
  })

  return jsonOK({ saved, message: `تم حفظ ${saved} فرد بنجاح` })
}
