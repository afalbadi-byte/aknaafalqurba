'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import {
  formatMoney, formatDate, statusBadge, STATUS_LABELS,
  PAYMENT_METHODS, PAYMENT_TYPES,
} from '@/lib/utils'
import { Plus, Wallet, Receipt } from 'lucide-react'

export default function Payments() {
  const [list,  setList]  = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { reload() }, [])
  async function reload() {
    setLoading(true)
    try {
      const r = await api.payments.mine()
      setList(r.payments); setTotal(r.total_approved)
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950">دفعاتي</h1>
          <p className="text-brand-600 text-sm">سجل اشتراكاتك وتبرعاتك في الصندوق</p>
        </div>
        <Link href="/payments/new" className="btn-primary"><Plus size={16} /> دفعة جديدة</Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card card-body">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center"><Wallet /></div>
            <div>
              <div className="text-xs text-brand-500">الإجمالي المعتمد</div>
              <div className="text-xl font-bold text-brand-950">{formatMoney(total)}</div>
            </div>
          </div>
        </div>
        <div className="card card-body">
          <div className="text-xs text-brand-500">عدد الدفعات</div>
          <div className="text-xl font-bold text-brand-950">{list.length}</div>
        </div>
        <div className="card card-body">
          <div className="text-xs text-brand-500">قيد المراجعة</div>
          <div className="text-xl font-bold text-amber-600">{list.filter(p => p.status === 'pending').length}</div>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-brand-100">
          <h3 className="font-bold text-brand-950">سجل الدفعات</h3>
        </div>
        {loading && <div className="p-8 text-center text-brand-500">جاري التحميل...</div>}
        {!loading && list.length === 0 && (
          <div className="p-12 text-center">
            <Receipt className="mx-auto mb-3 text-brand-300" size={40} />
            <p className="text-brand-500 mb-4">لم تسجّل أي دفعة بعد</p>
            <Link href="/payments/new" className="btn-primary"><Plus size={16} /> سجّل أول دفعة</Link>
          </div>
        )}
        {!loading && list.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/50 text-brand-700 text-xs">
                <tr>
                  <th className="text-right p-3 font-semibold">التاريخ</th>
                  <th className="text-right p-3 font-semibold">المبلغ</th>
                  <th className="text-right p-3 font-semibold">النوع</th>
                  <th className="text-right p-3 font-semibold">الطريقة</th>
                  <th className="text-right p-3 font-semibold">المرجع</th>
                  <th className="text-right p-3 font-semibold">الإيصال</th>
                  <th className="text-right p-3 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {list.map(p => (
                  <tr key={p.id} className="hover:bg-brand-50/30">
                    <td className="p-3 text-brand-700">{formatDate(p.created_at)}</td>
                    <td className="p-3 font-bold text-brand-950">{formatMoney(p.amount)}</td>
                    <td className="p-3 text-brand-700">{PAYMENT_TYPES[p.payment_type]}</td>
                    <td className="p-3 text-brand-700">{PAYMENT_METHODS[p.method]}</td>
                    <td className="p-3 text-brand-600 font-mono text-xs">{p.reference || '—'}</td>
                    <td className="p-3">
                      {p.receipt_path
                        ? <a href={p.receipt_path} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">عرض</a>
                        : <span className="text-brand-300">—</span>}
                    </td>
                    <td className="p-3"><span className={statusBadge(p.status)}>{STATUS_LABELS[p.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
