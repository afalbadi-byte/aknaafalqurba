'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import {
  formatMoney, formatDate, statusBadge, STATUS_LABELS, AID_TYPES,
} from '@/lib/utils'
import { Eye } from 'lucide-react'

export default function AdminAid() {
  const params = useSearchParams()
  const [list, setList] = useState<any[]>([])
  const [filter, setFilter] = useState(params.get('status') || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [filter])
  async function load() {
    setLoading(true)
    try { const r = await api.aid.list(filter || undefined); setList(r.requests) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-brand-950">طلبات المعونات</h1>
        <p className="text-brand-600 text-sm">مراجعة الطلبات ومتابعة حالاتها</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: '', l: 'الكل' },
          { v: 'submitted', l: 'جديدة' },
          { v: 'under_review', l: 'قيد المراجعة' },
          { v: 'approved', l: 'معتمدة' },
          { v: 'disbursed', l: 'تم الصرف' },
          { v: 'rejected', l: 'مرفوضة' },
        ].map(t => (
          <button key={t.v} onClick={() => setFilter(t.v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${filter === t.v ? 'bg-brand-950 text-white' : 'bg-white text-brand-700 border border-brand-200 hover:bg-brand-50'}`}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading && <div className="p-8 text-center text-brand-500">جاري التحميل...</div>}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-brand-700 text-xs">
                <tr>
                  <th className="text-right p-3 font-semibold">#</th>
                  <th className="text-right p-3 font-semibold">العضو</th>
                  <th className="text-right p-3 font-semibold">الفرع</th>
                  <th className="text-right p-3 font-semibold">النوع</th>
                  <th className="text-right p-3 font-semibold">العنوان</th>
                  <th className="text-right p-3 font-semibold">المبلغ</th>
                  <th className="text-right p-3 font-semibold">التاريخ</th>
                  <th className="text-right p-3 font-semibold">الحالة</th>
                  <th className="text-right p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {list.map(r => (
                  <tr key={r.id} className="hover:bg-brand-50/30">
                    <td className="p-3 text-brand-600 font-mono">#{r.id}</td>
                    <td className="p-3">
                      <div className="font-semibold text-brand-950">{r.member_name}</div>
                      <div className="text-xs text-brand-500">{r.member_phone}</div>
                    </td>
                    <td className="p-3 text-brand-700">{r.member_branch || '—'}</td>
                    <td className="p-3"><span className="badge badge-info">{AID_TYPES[r.aid_type]}</span></td>
                    <td className="p-3 text-brand-800 max-w-xs truncate">{r.title}</td>
                    <td className="p-3 font-bold text-brand-950">
                      {r.approved_amount ? <span className="text-emerald-700">{formatMoney(r.approved_amount)}</span>
                        : r.requested_amount ? formatMoney(r.requested_amount) : '—'}
                    </td>
                    <td className="p-3 text-brand-600">{formatDate(r.created_at)}</td>
                    <td className="p-3"><span className={statusBadge(r.status)}>{STATUS_LABELS[r.status]}</span></td>
                    <td className="p-3">
                      <Link href={`/aid/${r.id}`} className="p-2 inline-flex text-brand-700 hover:bg-brand-50 rounded"><Eye size={16} /></Link>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-brand-500">لا توجد طلبات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
