import { list } from '@vercel/blob'
import { requireRole, TOP_ADMIN_ROLES, jsonOK } from '@/lib/auth'

/**
 * GET /api/admin/usage/external
 * Calls the live APIs of every external provider we have credentials
 * for and returns whatever we can actually read. Anything we don't
 * have a token for is returned with status:"needs_token" + setup hint.
 */

const SAR_PER_USD = 3.75

type ServiceResult = {
  service:     string
  status:      'ok' | 'needs_token' | 'error' | 'no_data'
  monthly_sar: number | null
  usage:       Record<string, any> | null
  note:        string
  setup_hint?: string
  error?:      string
}

export async function GET() {
  const { error } = await requireRole(TOP_ADMIN_ROLES)
  if (error) return error

  const results: ServiceResult[] = []

  results.push(await readMoyasar())
  results.push(await readVercelBlob())
  results.push(readResend())
  results.push(readAnthropic())
  results.push(readVercelPlatform())
  results.push(readNeon())
  results.push(readDomain())

  return jsonOK({ services: results, sar_per_usd: SAR_PER_USD, generated_at: new Date().toISOString() })
}

/* ─────────────────────────────────────────────────────────────
   Moyasar — payments fee = 2.85% + 1 SAR per transaction
───────────────────────────────────────────────────────────── */
async function readMoyasar(): Promise<ServiceResult> {
  const key = process.env.PAYMENT_API_KEY
  if (!key) {
    return {
      service: 'بوابة الدفع (Moyasar)',
      status: 'needs_token',
      monthly_sar: null,
      usage: null,
      note: 'لم تُضِف API key للبوابة',
      setup_hint: 'ضف PAYMENT_API_KEY في متغيرات بيئة Vercel من لوحة Moyasar.',
    }
  }
  try {
    // Current month window
    const since = new Date(); since.setDate(1); since.setHours(0,0,0,0)
    const url = `https://api.moyasar.com/v1/payments?created[gt]=${since.toISOString()}&per=100`
    const auth = Buffer.from(`${key}:`).toString('base64')
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return svcError('بوابة الدفع (Moyasar)', `HTTP ${res.status}: ${text.slice(0, 120)}`)
    }
    const data = await res.json() as { payments?: any[]; meta?: { total_count?: number } }
    const payments = data.payments || []
    // Sum amounts (Moyasar returns amount in halalas — multiply 0.01)
    const amountSAR = payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0) / 100, 0)
    const feesSAR = payments
      .filter((p: any) => p.status === 'paid' || p.status === 'authorized')
      .reduce((s: number, p: any) => s + 1 + (Number(p.amount) || 0) / 100 * 0.0285, 0)

    return {
      service: 'بوابة الدفع (Moyasar)',
      status: 'ok',
      monthly_sar: Math.round(feesSAR * 100) / 100,
      usage: {
        payments_this_month: data.meta?.total_count ?? payments.length,
        amount_processed_sar: Math.round(amountSAR),
      },
      note: 'رسوم متغيرة: ٢.٨٥٪ + ١ ر.س لكل عملية ناجحة',
    }
  } catch (e: any) {
    return svcError('بوابة الدفع (Moyasar)', e.message || String(e))
  }
}

/* ─────────────────────────────────────────────────────────────
   Vercel Blob — list all blobs, sum sizes, price at $0.15/GB
───────────────────────────────────────────────────────────── */
async function readVercelBlob(): Promise<ServiceResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return {
      service: 'Vercel Blob (تخزين الملفات)',
      status: 'needs_token',
      monthly_sar: null,
      usage: null,
      note: 'لم تُربط Vercel Blob',
      setup_hint: 'أضف BLOB_READ_WRITE_TOKEN من لوحة Vercel ← Storage ← Blob.',
    }
  }
  try {
    let totalBytes = 0
    let count = 0
    let cursor: string | undefined = undefined
    let safety = 0
    do {
      const r = await list({ cursor, limit: 1000, token })
      for (const b of r.blobs) { totalBytes += b.size; count++ }
      cursor = r.cursor
      safety++
    } while (cursor && safety < 50)

    const gb = totalBytes / (1024 ** 3)
    const monthly_usd = Math.max(0, (gb - 1) * 0.15) // first 1GB free on Hobby
    return {
      service: 'Vercel Blob (تخزين الملفات)',
      status: count === 0 ? 'no_data' : 'ok',
      monthly_sar: Math.round(monthly_usd * SAR_PER_USD * 100) / 100,
      usage: { blobs: count, total_bytes: totalBytes, total_gb: Number(gb.toFixed(4)) },
      note: '٠.١٥$/GB شهرياً للتخزين (أول ١GB مجاني على Hobby)',
    }
  } catch (e: any) {
    return svcError('Vercel Blob (تخزين الملفات)', e.message || String(e))
  }
}

/* ─────────────────────────────────────────────────────────────
   Resend — no public usage endpoint with the regular send-key.
   We at least confirm the key is set.
───────────────────────────────────────────────────────────── */
function readResend(): ServiceResult {
  if (!process.env.RESEND_API_KEY) {
    return {
      service: 'بريد Resend',
      status: 'needs_token',
      monthly_sar: null,
      usage: null,
      note: 'لم تُضِف API key',
      setup_hint: 'الحساب المجاني ٣٠٠٠ رسالة/شهر. الفاتورة تظهر في لوحة resend.com.',
    }
  }
  return {
    service: 'بريد Resend',
    status: 'no_data',
    monthly_sar: null,
    usage: null,
    note: 'Resend لا يوفر API عام لقراءة الاستهلاك — راجع لوحة resend.com',
  }
}

/* ─────────────────────────────────────────────────────────────
   Anthropic — usage report requires an ADMIN API key (sk-ant-admin01-*)
───────────────────────────────────────────────────────────── */
function readAnthropic(): ServiceResult {
  const adminKey = process.env.ANTHROPIC_ADMIN_API_KEY
  if (!adminKey) {
    return {
      service: 'Anthropic (Claude)',
      status: 'needs_token',
      monthly_sar: null,
      usage: null,
      note: process.env.ANTHROPIC_API_KEY
        ? 'مفتاح API عادي موجود، لكن قراءة الاستهلاك تحتاج Admin Key'
        : 'لم تُضِف API key',
      setup_hint: 'أنشئ Admin API key من console.anthropic.com ← Settings ← Admin Keys، وأضفه باسم ANTHROPIC_ADMIN_API_KEY.',
    }
  }
  // TODO: call https://api.anthropic.com/v1/organizations/usage_report/messages
  return {
    service: 'Anthropic (Claude)',
    status: 'no_data',
    monthly_sar: null,
    usage: null,
    note: 'سيتم إضافة قراءة Usage Report قريباً',
  }
}

/* ─────────────────────────────────────────────────────────────
   Vercel platform (hosting) — needs personal access token
───────────────────────────────────────────────────────────── */
function readVercelPlatform(): ServiceResult {
  const tok = process.env.VERCEL_API_TOKEN
  if (!tok) {
    return {
      service: 'استضافة Vercel',
      status: 'needs_token',
      monthly_sar: null,
      usage: null,
      note: 'لجلب باقتك الفعلية تحتاج Vercel API token',
      setup_hint: 'أنشئ Token من vercel.com/account/tokens وأضفه باسم VERCEL_API_TOKEN.',
    }
  }
  return {
    service: 'استضافة Vercel',
    status: 'no_data',
    monthly_sar: null,
    usage: null,
    note: 'Token موجود — قراءة الفاتورة قيد التطوير',
  }
}

/* ─────────────────────────────────────────────────────────────
   Neon Postgres
───────────────────────────────────────────────────────────── */
function readNeon(): ServiceResult {
  const tok = process.env.NEON_API_KEY
  if (!tok) {
    return {
      service: 'قاعدة البيانات Neon',
      status: 'needs_token',
      monthly_sar: null,
      usage: null,
      note: 'لجلب فاتورة Neon تحتاج Neon API key',
      setup_hint: 'console.neon.tech ← Account Settings ← API Keys، أضفه باسم NEON_API_KEY.',
    }
  }
  return {
    service: 'قاعدة البيانات Neon',
    status: 'no_data',
    monthly_sar: null,
    usage: null,
    note: 'Token موجود — قراءة الفاتورة قيد التطوير',
  }
}

/* ─────────────────────────────────────────────────────────────
   Domain — there's no API for the registrar; mark as manual
───────────────────────────────────────────────────────────── */
function readDomain(): ServiceResult {
  const host = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
    : null
  return {
    service: host ? `نطاق ${host}` : 'النطاق',
    status: 'needs_token',
    monthly_sar: null,
    usage: null,
    note: 'تجديد سنوي ثابت — لا يوجد API لقراءته تلقائياً',
    setup_hint: 'أضف القيمة يدوياً في جدول الاشتراكات من فاتورة المسجّل.',
  }
}

function svcError(service: string, error: string): ServiceResult {
  return { service, status: 'error', monthly_sar: null, usage: null, note: 'فشل الاتصال', error }
}
