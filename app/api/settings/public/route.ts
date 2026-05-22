import { sql } from '@/lib/db'
import { jsonOK } from '@/lib/auth'

const PUBLIC_KEYS = [
  'fund_name', 'family_name', 'subscription_amount', 'subscription_period',
  'bank_name', 'bank_iban', 'bank_account_name', 'stc_pay_number',
  'whatsapp_number', 'phone', 'email', 'founded_year', 'about',
  'license_number', 'license_date', 'license_image', 'regulations',
]

export async function GET() {
  const rows = await sql<{ key_name: string; key_value: string }[]>`
    SELECT key_name, key_value FROM settings
  `
  const out: Record<string, any> = {}
  for (const r of rows) if (PUBLIC_KEYS.includes(r.key_name)) out[r.key_name] = r.key_value
  out.gateway_enabled  = !!process.env.PAYMENT_API_KEY
  out.gateway_provider = process.env.PAYMENT_API_KEY ? 'moyasar' : null
  return jsonOK({ settings: out })
}
