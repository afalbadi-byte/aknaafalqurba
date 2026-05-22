import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUser, requireRole, TREASURY_ROLES, jsonOK, jsonError } from '@/lib/auth'
import { notifyCommittee } from '@/lib/notify'
import { saveUpload } from '@/lib/storage'

// GET: list (committee only)
export async function GET(req: NextRequest) {
  const { error } = await requireRole(TREASURY_ROLES)
  if (error) return error
  const status = new URL(req.url).searchParams.get('status')
  try {
    const rows = status
      ? await sql`
          SELECT p.*, m.full_name, m.phone, r.full_name AS reviewer_name
          FROM payments p
          JOIN members m  ON m.id = p.member_id
          LEFT JOIN members r ON r.id = p.reviewed_by
          WHERE p.status = ${status}
          ORDER BY p.created_at DESC LIMIT 500
        `
      : await sql`
          SELECT p.*, m.full_name, m.phone, r.full_name AS reviewer_name
          FROM payments p
          JOIN members m  ON m.id = p.member_id
          LEFT JOIN members r ON r.id = p.reviewed_by
          ORDER BY p.created_at DESC LIMIT 500
        `
    return jsonOK({ payments: rows })
  } catch (e: any) {
    console.error('[GET /api/payments] DB error:', e?.message)
    return jsonError('db_error', e?.message || 'خطأ في قاعدة البيانات', 500)
  }
}

// POST: create (member self-service, multipart form)
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const fd     = await req.formData()
  const amount = Number(fd.get('amount'))
  const method = String(fd.get('method') || '')
  if (!amount || amount <= 0) return jsonError('bad_amount', 'المبلغ غير صحيح', 400)
  if (!['bank_transfer', 'stc_pay', 'gateway', 'cash'].includes(method))
    return jsonError('bad_method', 'طريقة دفع غير صالحة', 400)

  let receipt: string | null = null
  try {
    receipt = await saveUpload(fd.get('receipt') as File | null, 'receipts')
  } catch (e: any) {
    return jsonError('upload_error', e.message || 'فشل رفع الإيصال', 400)
  }
  if ((method === 'bank_transfer' || method === 'stc_pay') && !receipt)
    return jsonError('receipt_required', 'يرجى إرفاق صورة الإيصال', 400)

  const [ins] = await sql<{ id: number }[]>`
    INSERT INTO payments (member_id, amount, currency, payment_type, method,
                          reference, receipt_path, status, period_year, period_month, notes)
    VALUES (
      ${user.id}, ${amount}, 'SAR',
      ${String(fd.get('payment_type') || 'subscription')},
      ${method},
      ${(fd.get('reference') as string) || null},
      ${receipt},
      ${method === 'gateway' ? 'approved' : 'pending'},
      ${fd.get('period_year')  ? Number(fd.get('period_year'))  : null},
      ${fd.get('period_month') ? Number(fd.get('period_month')) : null},
      ${(fd.get('notes') as string) || null}
    )
    RETURNING id
  `
  if (method !== 'gateway') {
    await notifyCommittee('new_payment', 'دفعة جديدة بانتظار المراجعة',
      `${user.full_name} - ${amount.toFixed(2)} ر.س`, `/admin/payments?id=${ins.id}`)
  }
  return jsonOK({ id: ins.id })
}
