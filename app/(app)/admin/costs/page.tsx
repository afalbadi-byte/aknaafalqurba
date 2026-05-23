'use client'
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api-client'
import {
  Wallet, Plus, Trash2, Loader2, Save, X,
  Server, Database, Mail, BrainCircuit, HardDrive, CreditCard, Globe, Box,
  Edit3, Check,
} from 'lucide-react'

interface Cost {
  id: number
  service_name: string
  plan: string | null
  category: string
  monthly_cost: number | string
  currency: string
  notes: string | null
  is_active: boolean
  sort_order: number
}

const CATEGORIES: { value: string; label: string; icon: any; color: string }[] = [
  { value: 'hosting',  label: 'الاستضافة',         icon: Server,       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'database', label: 'قاعدة البيانات',     icon: Database,     color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'email',    label: 'البريد الإلكتروني', icon: Mail,         color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'ai',       label: 'الذكاء الاصطناعي',  icon: BrainCircuit, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  { value: 'storage',  label: 'تخزين الملفات',      icon: HardDrive,    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  { value: 'payment',  label: 'بوابة الدفع',        icon: CreditCard,   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'domain',   label: 'النطاق',             icon: Globe,        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: 'other',    label: 'أخرى',               icon: Box,          color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
]

const cat = (v: string) => CATEGORIES.find(c => c.value === v) || CATEGORIES[7]

export default function PlatformCostsPage() {
  const [costs,   setCosts]   = useState<Cost[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const [editId,  setEditId]  = useState<number | null>(null)
  const [draft,   setDraft]   = useState<Partial<Cost>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState<Partial<Cost>>({
    service_name: '', plan: '', category: 'other', monthly_cost: 0, notes: '',
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await api.costs.list()
      setCosts(r.costs)
    } catch (e: any) {
      setError(e.message || 'تعذّر تحميل التكاليف')
    } finally { setLoading(false) }
  }

  const totals = useMemo(() => {
    const active = costs.filter(c => c.is_active)
    const monthly = active.reduce((s, c) => s + Number(c.monthly_cost || 0), 0)
    return {
      monthly,
      yearly:  monthly * 12,
      count:   active.length,
      byCat:   CATEGORIES.map(c => ({
        ...c,
        total: active.filter(x => x.category === c.value).reduce((s, x) => s + Number(x.monthly_cost || 0), 0),
        count: active.filter(x => x.category === c.value).length,
      })).filter(c => c.count > 0),
    }
  }, [costs])

  function startEdit(c: Cost) {
    setEditId(c.id)
    setDraft({ ...c, monthly_cost: Number(c.monthly_cost) })
  }
  function cancelEdit() { setEditId(null); setDraft({}) }

  async function saveEdit() {
    if (!editId) return
    setSavingId(editId)
    try {
      await api.costs.update(editId, draft)
      await load()
      cancelEdit()
    } catch (e: any) { alert(e.message || 'فشل الحفظ') }
    finally { setSavingId(null) }
  }

  async function toggleActive(c: Cost) {
    setSavingId(c.id)
    try {
      await api.costs.update(c.id, { is_active: !c.is_active })
      await load()
    } finally { setSavingId(null) }
  }

  async function remove(c: Cost) {
    if (!confirm(`حذف "${c.service_name}" نهائياً؟`)) return
    setSavingId(c.id)
    try { await api.costs.remove(c.id); await load() }
    finally { setSavingId(null) }
  }

  async function createNew() {
    if (!newRow.service_name?.trim()) { alert('اسم الخدمة مطلوب'); return }
    setCreating(true)
    try {
      await api.costs.create(newRow)
      await load()
      setAdding(false)
      setNewRow({ service_name: '', plan: '', category: 'other', monthly_cost: 0, notes: '' })
    } catch (e: any) { alert(e.message || 'فشل الإضافة') }
    finally { setCreating(false) }
  }

  const fmt = (n: number) => n.toLocaleString('ar-SA', { maximumFractionDigits: 2, minimumFractionDigits: 0 })

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="animate-spin text-[#c5a059] mb-4" size={44} />
      <p className="font-bold text-brand-900 dark:text-brand-100">جاري تحميل التكاليف…</p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page title */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 flex items-center gap-2">
            <Wallet className="text-[#c5a059]" size={26} /> تكاليف تشغيل المنصة
          </h1>
          <p className="text-sm text-brand-500 dark:text-brand-400">
            جميع الاشتراكات والخدمات الخارجية المستخدمة في تشغيل صندوق أكناف القربى
          </p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 bg-[#1a365d] hover:bg-[#c5a059] text-white px-4 py-2 rounded-xl font-bold text-sm transition">
          <Plus size={14} /> إضافة خدمة
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Big totals card */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#1a365d] to-[#0a0f1e] text-white rounded-2xl p-5 shadow-lg">
          <p className="text-xs text-[#c5a059] font-bold mb-1">التكلفة الشهرية الإجمالية</p>
          <p className="text-3xl font-black">{fmt(totals.monthly)} <span className="text-base font-bold">ر.س</span></p>
          <p className="text-xs text-brand-200 mt-1 opacity-80">{totals.count} خدمة نشطة</p>
        </div>
        <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-700 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-brand-500 dark:text-brand-400 font-bold mb-1">التكلفة السنوية المتوقعة</p>
          <p className="text-3xl font-black text-[#1a365d] dark:text-brand-100">{fmt(totals.yearly)} <span className="text-base font-bold text-brand-500">ر.س</span></p>
          <p className="text-xs text-brand-400 mt-1">شهري × 12</p>
        </div>
        <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-700 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-brand-500 dark:text-brand-400 font-bold mb-1">المعدّل اليومي</p>
          <p className="text-3xl font-black text-[#1a365d] dark:text-brand-100">{fmt(totals.monthly / 30)} <span className="text-base font-bold text-brand-500">ر.س</span></p>
          <p className="text-xs text-brand-400 mt-1">شهري ÷ 30</p>
        </div>
      </div>

      {/* By category */}
      {totals.byCat.length > 0 && (
        <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-700 rounded-2xl p-5">
          <h2 className="font-bold text-sm text-[#1a365d] dark:text-brand-100 mb-3">التوزيع حسب الفئة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {totals.byCat.map(c => {
              const Icon = c.icon
              const pct = totals.monthly > 0 ? (c.total / totals.monthly) * 100 : 0
              return (
                <div key={c.value} className="border border-slate-100 dark:border-brand-700 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.color}`}>
                      <Icon size={15} />
                    </span>
                    <span className="text-[10px] text-brand-400">{pct.toFixed(0)}%</span>
                  </div>
                  <p className="text-[10px] text-brand-500 dark:text-brand-400 font-bold">{c.label}</p>
                  <p className="text-sm font-black text-brand-900 dark:text-brand-100">{fmt(c.total)} ر.س</p>
                  <p className="text-[10px] text-brand-400">{c.count} خدمة</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add new row */}
      {adding && (
        <div className="bg-[#c5a059]/10 border-2 border-[#c5a059]/40 rounded-2xl p-4">
          <h3 className="font-bold text-[#1a365d] dark:text-brand-100 text-sm mb-3 flex items-center gap-2">
            <Plus size={15} /> خدمة جديدة
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <input value={newRow.service_name as string || ''}
              onChange={e => setNewRow(r => ({ ...r, service_name: e.target.value }))}
              placeholder="اسم الخدمة"
              className="border border-slate-200 dark:border-brand-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-brand-900" />
            <input value={newRow.plan as string || ''}
              onChange={e => setNewRow(r => ({ ...r, plan: e.target.value }))}
              placeholder="الباقة"
              className="border border-slate-200 dark:border-brand-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-brand-900" />
            <select value={newRow.category as string}
              onChange={e => setNewRow(r => ({ ...r, category: e.target.value }))}
              className="border border-slate-200 dark:border-brand-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-brand-900">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input type="number" step="0.01" min="0" value={Number(newRow.monthly_cost) || ''}
              onChange={e => setNewRow(r => ({ ...r, monthly_cost: Number(e.target.value) }))}
              placeholder="التكلفة الشهرية (ر.س)"
              className="border border-slate-200 dark:border-brand-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-brand-900" />
          </div>
          <textarea value={newRow.notes as string || ''}
            onChange={e => setNewRow(r => ({ ...r, notes: e.target.value }))}
            placeholder="ملاحظات (اختياري)"
            rows={2}
            className="w-full mt-2 border border-slate-200 dark:border-brand-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-brand-900 resize-none" />
          <div className="flex gap-2 mt-3">
            <button onClick={createNew} disabled={creating}
              className="flex-1 bg-[#1a365d] hover:bg-[#c5a059] text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              إضافة
            </button>
            <button onClick={() => setAdding(false)}
              className="px-4 bg-slate-100 dark:bg-brand-800 text-brand-600 dark:text-brand-300 py-2 rounded-lg font-bold text-sm">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Costs table */}
      <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-brand-700 bg-slate-50 dark:bg-brand-950">
          <h2 className="font-bold text-sm text-[#1a365d] dark:text-brand-100">تفاصيل الخدمات والاشتراكات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-brand-500 dark:text-brand-400 bg-slate-50 dark:bg-brand-950">
              <tr>
                <th className="text-right px-4 py-2.5 font-semibold">الخدمة</th>
                <th className="text-right px-3 py-2.5 font-semibold">الفئة</th>
                <th className="text-right px-3 py-2.5 font-semibold">الباقة</th>
                <th className="text-right px-3 py-2.5 font-semibold">شهري (ر.س)</th>
                <th className="text-right px-3 py-2.5 font-semibold">سنوي (ر.س)</th>
                <th className="text-right px-3 py-2.5 font-semibold">الحالة</th>
                <th className="text-right px-3 py-2.5 font-semibold w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-brand-700">
              {costs.map(c => {
                const isEdit = editId === c.id
                const catInfo = cat(c.category)
                const Icon = catInfo.icon
                const monthly = isEdit ? Number(draft.monthly_cost ?? 0) : Number(c.monthly_cost || 0)
                return (
                  <tr key={c.id} className={`${!c.is_active ? 'opacity-50' : ''} hover:bg-slate-50/50 dark:hover:bg-brand-800/30`}>
                    <td className="px-4 py-3">
                      {isEdit ? (
                        <input value={draft.service_name as string ?? ''}
                          onChange={e => setDraft(d => ({ ...d, service_name: e.target.value }))}
                          className="w-full border border-slate-200 dark:border-brand-700 rounded-lg px-2 py-1 text-sm bg-white dark:bg-brand-900" />
                      ) : (
                        <div>
                          <p className="font-bold text-brand-900 dark:text-brand-100">{c.service_name}</p>
                          {c.notes && <p className="text-[11px] text-brand-400 dark:text-brand-500 mt-0.5 max-w-md">{c.notes}</p>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEdit ? (
                        <select value={draft.category as string}
                          onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                          className="border border-slate-200 dark:border-brand-700 rounded-lg px-2 py-1 text-xs bg-white dark:bg-brand-900">
                          {CATEGORIES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold ${catInfo.color}`}>
                          <Icon size={11} /> {catInfo.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEdit ? (
                        <input value={draft.plan as string ?? ''}
                          onChange={e => setDraft(d => ({ ...d, plan: e.target.value }))}
                          className="w-full border border-slate-200 dark:border-brand-700 rounded-lg px-2 py-1 text-xs bg-white dark:bg-brand-900" />
                      ) : (
                        <span className="text-xs text-brand-600 dark:text-brand-300">{c.plan || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      {isEdit ? (
                        <input type="number" step="0.01" min="0" value={Number(draft.monthly_cost) || ''}
                          onChange={e => setDraft(d => ({ ...d, monthly_cost: Number(e.target.value) }))}
                          className="w-24 border border-slate-200 dark:border-brand-700 rounded-lg px-2 py-1 text-sm bg-white dark:bg-brand-900" />
                      ) : (
                        <span className={`font-bold ${monthly === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-900 dark:text-brand-100'}`}>
                          {monthly === 0 ? 'مجانية' : fmt(monthly)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-brand-500 dark:text-brand-400">
                      {monthly > 0 ? fmt(monthly * 12) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleActive(c)} disabled={savingId === c.id}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg ${
                          c.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 dark:bg-brand-700 dark:text-brand-300 hover:bg-slate-300'
                        }`}>
                        {c.is_active ? 'نشطة' : 'موقوفة'}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {isEdit ? (
                          <>
                            <button onClick={saveEdit} disabled={savingId === c.id}
                              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 rounded">
                              {savingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={cancelEdit}
                              className="p-1.5 hover:bg-slate-50 dark:hover:bg-brand-800 text-brand-500 rounded">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(c)}
                              className="p-1.5 hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-500 rounded">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => remove(c)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 rounded">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {costs.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-brand-400">لا توجد خدمات مسجّلة بعد</td></tr>
              )}
            </tbody>
            {costs.length > 0 && (
              <tfoot className="bg-[#1a365d]/5 dark:bg-[#1a365d]/20 border-t-2 border-[#1a365d]/20 dark:border-brand-700 font-bold">
                <tr>
                  <td className="px-4 py-3 text-[#1a365d] dark:text-brand-100" colSpan={3}>الإجمالي (الخدمات النشطة)</td>
                  <td className="px-3 py-3 font-mono text-[#1a365d] dark:text-brand-100">{fmt(totals.monthly)}</td>
                  <td className="px-3 py-3 font-mono text-[#1a365d] dark:text-brand-100">{fmt(totals.yearly)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Help note */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong>ملاحظة:</strong> هذه الأرقام تقديرية مبنية على باقات مزوّدي الخدمة الحاليين بالأسعار العامة.
          الفواتير الفعلية قد تختلف حسب الاستخدام الشهري (مثلاً Vercel Blob ورسوم API).
          عدّل التكلفة من زر "✏️" بجانب كل خدمة لتعكس فاتورتك الفعلية، أو أوقف الخدمات غير المستخدمة.
        </p>
      </div>
    </div>
  )
}
