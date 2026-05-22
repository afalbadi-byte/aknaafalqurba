/**
 * POST /api/payments/extract-receipt  { receipt: "<base64 data URL>" }
 * Authenticated member only.
 * Calls Claude Vision to extract payment fields from a bank-transfer receipt.
 */
import { NextRequest } from 'next/server'
import { requireUser, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { extractReceipt } from '@/lib/ai-receipt'

export async function POST(req: NextRequest) {
  const { error } = await requireUser()
  if (error) return error

  const body = await parseJson(req)
  if (!body?.receipt) return jsonError('missing_field', 'receipt مطلوب', 400)

  const result = await extractReceipt(String(body.receipt))
  if (!result) {
    return jsonError('ai_unavailable', 'خدمة الاستخراج الذكي غير متاحة حالياً', 503)
  }

  return jsonOK({ extracted: result })
}
