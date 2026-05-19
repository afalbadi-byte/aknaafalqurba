import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, jsonOK, jsonError, parseJson } from '@/lib/auth'
import { moyasarCall } from '../moyasar'

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  if (!process.env.PAYMENT_API_KEY) {
    return jsonError('gateway_disabled', 'بوابة الدفع غير مفعّلة. تواصل مع لجنة الصندوق.', 503)
  }

  const body   = await parseJson(req)
  const amount = Number(body.amount)
  if (!amount || amount < 1) return jsonError('bad_amount', 'المبلغ غير صحيح', 400)

  // 1) أنشئ سجل دفعة pending
  const [ins] = await sql<{ id: number }[]>`
    INSERT INTO payments (member_id, amount, currency, payment_type, method, status,
                          period_year, period_month, notes)
    VALUES (
      ${user.id}, ${amount}, 'SAR',
      ${String(body.payment_type || 'subscription')},
      'gateway', 'pending',
      ${body.period_year  ? Number(body.period_year)  : null},
      ${body.period_month ? Number(body.period_month) : null},
      ${body.notes || null}
    )
    RETURNING id
  `

  // 2) أنشئ فاتورة ميسر
  const origin   = body.origin || process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get('host')}`
  const callback = `${origin}/payment-return?pid=${ins.id}`

  let invoice: any
  try {
    invoice = await moyasarCall('POST', '/invoices', {
      amount:       Math.round(amount * 100),  // halalas
      currency:     'SAR',
      description:  `صندوق أكناف القربى - ${user.full_name} #${ins.id}`,
      callback_url: callback,
    })
  } catch (e: any) {
    return jsonError('gateway_error', e.message || 'تعذّر إنشاء فاتورة الدفع', 502)
  }

  await sql`UPDATE payments SET reference = ${invoice.id} WHERE id = ${ins.id}`

  return jsonOK({
    payment_id: ins.id,
    invoice_id: invoice.id,
    url:        invoice.url,
  })
}
