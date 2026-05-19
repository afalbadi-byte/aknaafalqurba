import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, jsonOK, jsonError } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { moyasarCall } from '../moyasar'

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const pid = Number(new URL(req.url).searchParams.get('pid'))
  if (!pid) return jsonError('bad_request', 'معرّف الدفعة مفقود', 400)

  const [p] = await sql<any[]>`SELECT * FROM payments WHERE id = ${pid}`
  if (!p) return jsonError('not_found', 'الدفعة غير موجودة', 404)
  if (p.member_id !== user.id) return jsonError('forbidden', 'لا تملك الصلاحية', 403)

  if (p.status === 'approved') return jsonOK({ status: 'approved' })
  if (!p.reference) return jsonError('bad_state', 'الدفعة غير مرتبطة بفاتورة ميسر', 400)

  let inv: any
  try { inv = await moyasarCall('GET', `/invoices/${p.reference}`) }
  catch (e: any) { return jsonError('gateway_error', e.message, 502) }

  const mst = inv.status as string

  if (mst === 'paid') {
    await sql`UPDATE payments SET status='approved', reviewed_at=NOW(), updated_at=NOW() WHERE id=${pid}`
    await notify(p.member_id, 'payment_approved', 'تم استلام دفعتك بنجاح',
      `مبلغ ${Number(p.amount).toFixed(2)} ر.س عبر بوابة الدفع`, '/payments')
    return jsonOK({ status: 'approved' })
  }

  if (['failed', 'canceled', 'expired'].includes(mst)) {
    await sql`
      UPDATE payments
      SET status='rejected', reviewer_notes=${`فشل الدفع عبر البوابة (${mst})`},
          reviewed_at=NOW(), updated_at=NOW()
      WHERE id=${pid}
    `
    return jsonOK({ status: 'rejected', gateway_status: mst })
  }

  return jsonOK({ status: 'pending', gateway_status: mst })
}
