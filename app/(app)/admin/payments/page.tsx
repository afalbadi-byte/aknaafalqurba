'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import {
  formatMoney, formatDate, statusBadge, STATUS_LABELS,
  PAYMENT_METHODS, PAYMENT_TYPES,
} from '@/lib/utils'
import { CheckCircle, XCircle, Eye, Trash2, Sparkles } from 'lucide-react'
import Modal from '@/components/modal'

export default function AdminPayments() {
  const params = useSearchParams()
  const [list,    setList]    = useState<any[]>([])
  const [filter,  setFilter]  = useState(params.get('status') || '')
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [viewing, setViewing] = useState<any>(null)
  const [notes,   setNotes]   = useState('')

  useEffect(() => { load() }, [filter])
  async function load() {
    setLoading(true); setLoadErr('')
    try {
      const r = await api.payments.list(filter || undefined)
      setList(r.payments ?? [])
    } catch (e: any) {
      setLoadErr(e.message || 'فشل تحميل الدفعات')
      setList([])
    } finally {
      setLoading(false)
    }
  }
  async function review(id: number, decision: string) {
    await api.payments.review(id, decision, notes)
    setViewing(null); setNotes(''); load()
  }
  async function remove(id: number) {
    if (!confirm('حذف هذه الدفعة نهائياً؟')) return
    await api.payments.remove(id); load()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">مراجعة الدفعات</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">اعتماد أو رفض الدفعات المُقدّمة من الأعضاء</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: '', l: 'الكل' },
          { v: 'pending', l: 'بانتظار المراجعة' },
          { v: 'approved', l: 'المعتمدة' },
          { v: 'rejected', l: 'المرفوضة' },
        ].map(t => (
          <button key={t.v} onClick={() => setFilter(t.v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              filter === t.v
                ? 'bg-brand-950 dark:bg-gold-500 text-white dark:text-brand-950'
                : 'bg-white dark:bg-brand-800 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-700'
            }`}>
            {t.l}
          </button>
        ))}
      </div>

      {loadErr && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm flex items-center justify-between">
          <span>⚠️ {loadErr}</span>
          <button onClick={load} className="underline text-xs">إعادة المحاولة</button>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading && <div className="p-8 text-center text-brand-500 dark:text-brand-400">جاري التحميل...</div>}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 dark:bg-brand-800 text-brand-700 dark:text-brand-300 text-xs">
                <tr>
                  <th className="text-right p-3 font-semibold">العضو</th>
                  <th className="text-right p-3 font-semibold">المبلغ</th>
                  <th className="text-right p-3 font-semibold">النوع</th>
                  <th className="text-right p-3 font-semibold">الطريقة</th>
                  <th className="text-right p-3 font-semibold">التاريخ</th>
                  <th className="text-right p-3 font-semibold">الحالة</th>
                  <th className="text-right p-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50 dark:divide-brand-800">
                {list.map(p => (
                  <tr key={p.id} className="hover:bg-brand-50/30 dark:hover:bg-brand-800/40">
                    <td className="p-3">
                      <div className="font-bold text-brand-950 dark:text-brand-50">{p.full_name}</div>
                      <div className="text-xs text-brand-500 dark:text-brand-400">{p.phone}</div>
                    </td>
                    <td className="p-3 font-bold text-brand-950 dark:text-brand-50">{formatMoney(p.amount)}</td>
                    <td className="p-3 text-brand-700 dark:text-brand-300">{PAYMENT_TYPES[p.payment_type]}</td>
                    <td className="p-3 text-brand-700 dark:text-brand-300">{PAYMENT_METHODS[p.method]}</td>
                    <td className="p-3 text-brand-600 dark:text-brand-400">{formatDate(p.created_at, true)}</td>
                    <td className="p-3"><span className={statusBadge(p.status)}>{STATUS_LABELS[p.status]}</span></td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setViewing(p); setNotes(p.reviewer_notes || '') }}
                          className="p-2 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-800 rounded" title="عرض"><Eye size={16} /></button>
                        {p.status === 'pending' && (
                          <>
                            <button onClick={() => review(p.id, 'approved')} className="p-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded" title="اعتماد"><CheckCircle size={16} /></button>
                            <button onClick={() => review(p.id, 'rejected')} className="p-2 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="رفض"><XCircle size={16} /></button>
                          </>
                        )}
                        <button onClick={() => remove(p.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="حذف"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-brand-500 dark:text-brand-400">لا توجد دفعات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`دفعة #${viewing?.id}`} size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <KV k="العضو" v={viewing.full_name} />
              <KV k="الجوال" v={viewing.phone} mono />
              <KV k="المبلغ" v={formatMoney(viewing.amount)} bold />
              <KV k="النوع" v={PAYMENT_TYPES[viewing.payment_type]} />
              <KV k="الطريقة" v={PAYMENT_METHODS[viewing.method]} />
              <KV k="المرجع" v={viewing.reference || '—'} mono />
              <KV k="الفترة" v={viewing.period_year ? `${viewing.period_month}/${viewing.period_year}` : '—'} />
              <KV k="التاريخ" v={formatDate(viewing.created_at, true)} />
            </div>
            {/* AI-extracted receipt data */}
            {viewing.ai_extracted && (() => {
              const ai = typeof viewing.ai_extracted === 'string'
                ? (() => { try { return JSON.parse(viewing.ai_extracted) } catch { return null } })()
                : viewing.ai_extracted
              if (!ai) return null
              return (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-700/60 bg-emerald-50/60 dark:bg-emerald-900/20 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs mb-2">
                    <Sparkles size={13} />
                    بيانات مستخرجة من الإيصال بالذكاء الاصطناعي
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-emerald-900 dark:text-emerald-200">
                    {ai.amount        != null && <span>المبلغ المستخرج: <strong>{ai.amount} ر.س</strong></span>}
                    {ai.reference          && <span>رقم العملية: <strong className="font-mono">{ai.reference}</strong></span>}
                    {ai.transfer_date      && <span>تاريخ التحويل: <strong>{ai.transfer_date}</strong></span>}
                    {ai.bank_name          && <span>الجهة: <strong>{ai.bank_name}</strong></span>}
                    {ai.sender_name        && <span>المُرسِل: <strong>{ai.sender_name}</strong></span>}
                  </div>
                </div>
              )
            })()}

            {viewing.notes && (
              <div className="bg-brand-50/50 dark:bg-brand-800/50 rounded-lg p-3">
                <div className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-1">ملاحظات العضو</div>
                <div className="text-sm text-brand-800 dark:text-brand-200">{viewing.notes}</div>
              </div>
            )}
            {viewing.receipt_path && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">صورة الإيصال</span>
                  <a
                    href={viewing.receipt_path}
                    download={`receipt-${viewing.id}.${viewing.receipt_path.startsWith('data:application/pdf') ? 'pdf' : 'jpg'}`}
                    className="text-xs text-brand-600 dark:text-brand-400 underline hover:text-brand-900 dark:hover:text-brand-100"
                  >
                    ⬇ تحميل
                  </a>
                </div>
                {viewing.receipt_path.startsWith('data:application/pdf') ? (
                  <div className="bg-brand-50 dark:bg-brand-800 p-4 rounded-lg text-brand-700 dark:text-brand-300 text-sm text-center">
                    📄 ملف PDF — اضغط "تحميل" لفتحه
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={viewing.receipt_path}
                    alt="إيصال"
                    className="max-h-96 w-full object-contain mx-auto rounded-xl border border-brand-100 dark:border-brand-700 bg-white"
                  />
                )}
              </div>
            )}
            <div>
              <label className="label">ملاحظات المراجعة</label>
              <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            {viewing.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => review(viewing.id, 'approved')} className="btn-primary flex-1">
                  <CheckCircle size={16} /> اعتماد
                </button>
                <button onClick={() => review(viewing.id, 'rejected')} className="btn-danger flex-1">
                  <XCircle size={16} /> رفض
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function KV({ k, v, bold, mono }: any) {
  return (
    <div>
      <div className="text-xs text-brand-500 dark:text-brand-400 font-semibold mb-0.5">{k}</div>
      <div className={`text-brand-950 dark:text-brand-50 ${bold ? 'font-bold text-base' : ''} ${mono ? 'font-mono' : ''}`}>{v}</div>
    </div>
  )
}
