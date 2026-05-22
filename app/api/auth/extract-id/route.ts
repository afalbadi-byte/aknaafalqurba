/**
 * POST /api/auth/extract-id  { id_document: string }
 * Public endpoint — no auth required.
 * Extracts name, national_id, birth_date, gender from a Tawakkalna ID image/PDF.
 * The document is NOT stored — used only for AI field extraction before registration.
 */
import { NextRequest } from 'next/server'
import { jsonOK, jsonError, parseJson } from '@/lib/auth'
import { extractIdDocument } from '@/lib/ai-verify'

export async function POST(req: NextRequest) {
  const body = await parseJson(req)
  if (!body?.id_document) return jsonError('bad_request', 'id_document مطلوب', 400)

  const idDoc = String(body.id_document)
  if (!idDoc.startsWith('data:')) return jsonError('bad_request', 'يجب أن يكون الملف بصيغة base64 data URL', 400)

  const result = await extractIdDocument(idDoc)
  if (!result) {
    return jsonError('ai_unavailable', 'خدمة الاستخراج الذكي غير متاحة حالياً — أملأ البيانات يدوياً', 503)
  }

  return jsonOK({ extracted: result })
}
