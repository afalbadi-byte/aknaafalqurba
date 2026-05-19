// Shared Moyasar REST helper (called from start/verify/webhook routes).

export async function moyasarCall(method: 'GET' | 'POST', path: string, body?: Record<string, any>) {
  const key = process.env.PAYMENT_API_KEY
  if (!key) throw new Error('PAYMENT_API_KEY not set')

  const url  = `https://api.moyasar.com/v1${path}`
  const auth = 'Basic ' + Buffer.from(`${key}:`).toString('base64')

  const init: RequestInit = {
    method,
    headers: { Authorization: auth, Accept: 'application/json' },
  }
  if (body) {
    const form = new URLSearchParams()
    for (const [k, v] of Object.entries(body)) form.append(k, String(v))
    init.body = form
    init.headers = { ...init.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
  }

  const res  = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.message || `Moyasar HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}
