'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import {
  formatDate, formatMoney, statusBadge, STATUS_LABELS, AID_TYPES,
} from '@/lib/utils'
import { Plus, FileHeart } from 'lucide-react'

export default function AidList() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.aid.mine().then(r => setList(r.requests)).finally(() => setLoading(false)) }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">طلبات الدعم</h1>
          <p className="text-brand-600 dark:text-brand-400 text-sm">قدّم طلبك وتابع حالته خطوة بخطوة</p>
        </div>
        <Link href="/aid/new" className="btn-primary"><Plus size={16} /> طلب دعم جديد</Link>
      </div>

      <div className="card card-body bg-brand-50/40 dark:bg-brand-800/40 border-brand-200 dark:border-brand-700">
        <div className="text-sm text-brand-800 dark:text-brand-200 leading-relaxed">
          <strong>تنبيه:</strong> كل طلبات الدعم تُعامَل بسرية تامة ولا يطّلع عليها سوى أعضاء لجنة الدعم.
        </div>
      </div>

      {loading && <div className="card card-body text-center text-brand-500 dark:text-brand-400">جاري التحميل...</div>}
      {!loading && list.length === 0 && (
        <div className="card card-body text-center py-12">
          <FileHeart className="mx-auto mb-3 text-brand-300 dark:text-brand-600" size={40} />
          <p className="text-brand-500 dark:text-brand-400 mb-4">لم تقدّم أي طلب دعم بعد</p>
          <Link href="/aid/new" className="btn-primary"><Plus size={16} /> تقديم طلب</Link>
        </div>
      )}

      <div className="grid gap-3">
        {list.map(r => (
          <Link key={r.id} href={`/aid/${r.id}`} className="card card-body hover:shadow-lg transition">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-info text-[10px]">{AID_TYPES[r.aid_type]}</span>
                  <span className={statusBadge(r.status)}>{STATUS_LABELS[r.status]}</span>
                </div>
                <h3 className="font-bold text-brand-950 dark:text-brand-50 truncate">{r.title}</h3>
                <p className="text-sm text-brand-600 dark:text-brand-400 line-clamp-2 mt-1">{r.description}</p>
                <div className="text-xs text-brand-400 dark:text-brand-500 mt-2">قُدّم في {formatDate(r.created_at)}</div>
              </div>
              <div className="text-end shrink-0">
                {r.requested_amount && (
                  <div>
                    <div className="text-xs text-brand-500 dark:text-brand-400">المبلغ المطلوب</div>
                    <div className="font-bold text-brand-950 dark:text-brand-50">{formatMoney(r.requested_amount)}</div>
                  </div>
                )}
                {r.approved_amount && (
                  <div className="mt-2">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">المعتمد</div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400">{formatMoney(r.approved_amount)}</div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
