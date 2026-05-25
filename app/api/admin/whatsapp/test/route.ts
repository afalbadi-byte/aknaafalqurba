import { NextRequest } from 'next/server'
import { requireRole, TOP_ADMIN_ROLES, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { sendWhatsappOTP, normalisePhone } from '@/lib/whatsapp'

/**
 * POST /api/admin/whatsapp/test
 *   body: { phone: string }
 *
 * Fires the configured template (hello_world during setup, or the
 * project's authentication template later) at the given phone number.
 * Admin-only. Used to verify the WhatsApp Cloud API integration
 * without going through the full OTP flow.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error
  const body = await parseJson(req)
  if (!body?.phone) return jsonError('missing', 'رقم الجوال مطلوب', 400)

  const phone = normalisePhone(body.phone)
  const res = await sendWhatsappOTP(phone, '123456') // dummy code, hello_world ignores it

  if (!res.ok) return jsonError('whatsapp_failed', (res as any).error || 'فشل', 502)
  return jsonOK({ phone, messageId: res.messageId })
}
