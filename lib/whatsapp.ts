// WhatsApp Cloud API (Meta) — free up to 1,000 conversations / month.
//
// Setup (one-time, free):
//   1. Create a Meta Developer account → developers.facebook.com
//   2. Create a "WhatsApp Business" app
//   3. Add a phone number (test number works for dev)
//   4. Create an OTP message template named  otp_verification  (category: UTILITY)
//      Template body (Arabic):
//        «رمز التحقق لصندوق أكناف القربى: {{1}}. صالح لمدة 10 دقائق. لا تشاركه مع أحد.»
//   5. Set env vars:
//        WHATSAPP_TOKEN    — permanent user access token from Meta
//        WHATSAPP_PHONE_ID — Phone Number ID (from WhatsApp Business > API Setup)
//        WHATSAPP_TEMPLATE — template name (default: otp_verification)

import { normalizePhone } from './sms'

export function hasWhatsAppProvider(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)
}

export async function sendWhatsAppOtp(phone: string, code: string): Promise<boolean> {
  const token    = process.env.WHATSAPP_TOKEN
  const phoneId  = process.env.WHATSAPP_PHONE_ID
  const template = process.env.WHATSAPP_TEMPLATE || 'otp_verification'

  if (!token || !phoneId) return false

  const to = normalizePhone(phone)

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name:     template,
          language: { code: 'ar' },
          components: [{
            type:       'body',
            parameters: [{ type: 'text', text: code }],
          }],
        },
      }),
    })

    const data = await res.json() as any
    const ok   = !!data?.messages?.[0]?.id
    if (!ok) console.error('[whatsapp] error:', JSON.stringify(data?.error || data))
    else     console.log('[whatsapp] sent to:', to)
    return ok
  } catch (e) {
    console.error('[whatsapp]', (e as Error).message)
    return false
  }
}
