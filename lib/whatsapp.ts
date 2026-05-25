/**
 * WhatsApp Cloud API helpers.
 *
 * Env vars required:
 *   WHATSAPP_ACCESS_TOKEN     — System User access token from Meta
 *   WHATSAPP_PHONE_NUMBER_ID  — the ID of the sending phone number
 *   WHATSAPP_OTP_TEMPLATE     — (optional) name of the authentication template;
 *                               defaults to 'aknafalqurba_otp'.
 *   WHATSAPP_TEMPLATE_LANG    — (optional) template language code; default 'ar'.
 */

const GRAPH = 'https://graph.facebook.com/v21.0'

/** Normalise a Saudi phone number to E.164 (e.g. 966539669988). */
export function normalisePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '')
  if (digits.startsWith('966')) return digits
  if (digits.startsWith('0'))   return '966' + digits.slice(1)
  if (digits.startsWith('5'))   return '966' + digits
  return digits
}

/** Send an authentication template message containing the OTP code. */
export async function sendWhatsappOTP(toRaw: string, code: string): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const token  = process.env.WHATSAPP_ACCESS_TOKEN
  const fromId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const tmplName = process.env.WHATSAPP_OTP_TEMPLATE || 'aknafalqurba_otp'
  const lang     = process.env.WHATSAPP_TEMPLATE_LANG || 'ar'

  if (!token || !fromId) return { ok: false, error: 'WhatsApp غير مهيّأ على الخادم' }

  const to = normalisePhone(toRaw)
  if (!to || to.length < 11) return { ok: false, error: 'رقم جوال غير صالح' }

  // 'hello_world' is Meta's built-in test template — no parameters allowed.
  // Used early on to verify the integration works before our own
  // authentication template (e.g. aknafalqurba_otp) gets approved.
  const isHelloWorld = tmplName === 'hello_world'

  const body: any = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: tmplName,
      language: { code: lang },
    },
  }
  if (!isHelloWorld) {
    body.template.components = [
      {
        type: 'body',
        parameters: [{ type: 'text', text: code }],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: code }],
      },
    ]
  }

  try {
    const r = await fetch(`${GRAPH}/${fromId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await r.json().catch(() => ({} as any))
    if (!r.ok) {
      return { ok: false, error: data?.error?.message || `HTTP ${r.status}` }
    }
    return { ok: true, messageId: data?.messages?.[0]?.id }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
}

/** Generate a 6-digit OTP code. */
export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}
