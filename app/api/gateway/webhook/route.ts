import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { notify } from '@/lib/notify'

// Server-to-server webhook from Moyasar. Authoritative source of truth.
// Configure in Moyasar dashboard: https://yourdomain.com/api/gateway/webhook
export async function POST(req: NextRequest) {
  let raw: any
  try { raw = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  const payload    = raw?.data || raw
  const invoice_id = payload?.id
  const status     = payload?.status
  if (!invoice_id) return NextResponse.json({ ok: false }, { status: 400 })

  const [p] = await sql<any[]>`SELECT * FROM payments WHERE reference = ${invoice_id}`
  if (!p) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })

  if (status === 'paid' && p.status !== 'approved') {
    await sql`UPDATE payments SET status='approved', reviewed_at=NOW(), updated_at=NOW() WHERE id=${p.id}`
    await notify(p.member_id, 'payment_approved', 'تم استلام دفعتك بنجاح',
      `مبلغ ${Number(p.amount).toFixed(2)} ر.س`, '/payments')
  } else if (['failed', 'canceled', 'expired'].includes(status) && p.status === 'pending') {
    await sql`
      UPDATE payments SET status='rejected',
        reviewer_notes=${`فشل الدفع عبر البوابة (${status})`},
        reviewed_at=NOW(), updated_at=NOW()
      WHERE id=${p.id}
    `
  }
  return NextResponse.json({ ok: true })
}
