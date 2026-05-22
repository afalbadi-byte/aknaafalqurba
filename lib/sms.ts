// SMS sending — Msegat (primary, KSA) + Unifonic (fallback) + dev console log.
//
// Environment variables:
//   MSEGAT_USERNAME  — Msegat account username
//   MSEGAT_API_KEY   — Msegat API key
//   MSEGAT_SENDER    — Sender name registered with Msegat (e.g. "AknaafQ")
//
//   UNIFONIC_APP_SID — Unifonic AppSid (fallback)
//   UNIFONIC_SENDER  — Unifonic sender ID (optional)
//
// If no provider is configured the message is printed to the server console
// so development works without real credentials.

/** Normalise a Saudi phone to international format (9665XXXXXXXX) */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('009665')) return d.slice(2)          // 00966…
  if (d.startsWith('9665'))   return d                   // already international
  if (d.startsWith('966'))    return d                   // 966X…
  if (d.startsWith('05'))     return '966' + d.slice(1)  // 05XXXXXXXX
  if (d.startsWith('5'))      return '9665' + d.slice(1) // 5XXXXXXXX
  return d
}

// ── Msegat ───────────────────────────────────────────────────────────────────
async function trySendViaMsegat(to: string, message: string): Promise<boolean> {
  const userName   = process.env.MSEGAT_USERNAME
  const apikey     = process.env.MSEGAT_API_KEY
  const userSender = process.env.MSEGAT_SENDER || 'AknaafQ'
  if (!userName || !apikey) return false

  try {
    const res  = await fetch('https://www.msegat.com/gw/sendsms.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, numbers: to, userSender, apikey, msg: message }),
    })
    const text = await res.text()
    console.log('[sms/msegat] to:', to, '→ response:', text.trim())
    // Msegat returns "1" for success
    return text.trim().startsWith('1')
  } catch (e) {
    console.error('[sms/msegat]', (e as Error).message)
    return false
  }
}

// ── Unifonic ─────────────────────────────────────────────────────────────────
async function trySendViaUnifonic(to: string, message: string): Promise<boolean> {
  const AppSid = process.env.UNIFONIC_APP_SID
  if (!AppSid) return false

  try {
    const body = new URLSearchParams({ AppSid, Recipient: to, Body: message })
    if (process.env.UNIFONIC_SENDER) body.set('SenderID', process.env.UNIFONIC_SENDER)

    const res  = await fetch('https://el.cloud.unifonic.com/rest/messages/sendmessage', {
      method: 'POST',
      body,
    })
    const data = await res.json() as any
    console.log('[sms/unifonic] to:', to, '→ Status:', data?.Success)
    return data?.Success === true
  } catch (e) {
    console.error('[sms/unifonic]', (e as Error).message)
    return false
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if at least one real SMS provider is configured */
export function hasSmsProvider(): boolean {
  return !!(process.env.MSEGAT_USERNAME && process.env.MSEGAT_API_KEY) ||
         !!(process.env.UNIFONIC_APP_SID)
}

export async function sendSms(rawPhone: string, message: string): Promise<boolean> {
  const to = normalizePhone(rawPhone)

  if (await trySendViaMsegat(to, message))   return true
  if (await trySendViaUnifonic(to, message)) return true

  // No SMS provider configured — log to console (dev mode)
  console.log(`\n📱 [SMS-DEV] To: ${to}\n${message}\n`)
  return true
}
