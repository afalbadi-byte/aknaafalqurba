'use client'
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api-client'
import {
  Wallet, Plus, Trash2, Loader2, Save, X,
  Server, Database, Mail, BrainCircuit, HardDrive, CreditCard, Globe, Box,
  Edit3, Check, Activity, Users, FileText, Bell, Image as ImageIcon,
  Receipt, RefreshCw, ServerCog,
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

function bytesPretty(bytesStr: string | number) {
  const n = Number(bytesStr || 0)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const SERVICE_LABEL: Record<string, string> = {
  database_url:    'قاعدة البيانات (Postgres)',
  anthropic_api:   'Anthropic (Claude AI)',
  resend_api:      'Resend (البريد)',
  smtp_configured: 'SMTP (بريد بديل)',
  payment_gateway: 'بوابة الدفع (Moyasar)',
  vercel_blob:     'Vercel Blob (تخزين)',
}

export default function PlatformCostsPage() {
  const [costs,    setCosts]    = useState<Cost[]>([])
  const [usage,    setUsage]    = useState<any>(null)
  const [external, setExternal] = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,    setError]    = useState('')

  const [editId,  setEditId]  = useState<number | null>(null)
  const [draft,   setDraft]   = useState<Partial<Cost>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState<Partial<Cost>>({
    service_name: '', plan: '', category: 'hosting', monthly_cost: 0, notes: '',
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const [costsRes, usageRes, externalRes] = await Promise.all([
        api.costs.list(),
        api.costs.usage(),
        api.costs.external().catch(() => ({ services: [] })),
      ])
      setCosts(costsRes.costs)
      setUsage(usageRes)
      setExternal(externalRes)
    } catch (e: any) { setError(e.message || 'تعذّر التحميل') }
    finally { setLoading(false) }
  }

  async function refresh() {
    setRefreshing(true)
    try {
      const [usageRes, externalRes] = await Promise.all([
        api.costs.usage(),
        api.costs.external().catch(() => ({ services: [] })),
      ])
      setUsage(usageRes)
      setExternal(externalRes)
    } finally { setRefreshing(false) }
  }

  const totals = useMemo(() => {
    const active = costs.filter(c => c.is_active)
    const monthly = active.reduce((s, c) => s + Number(c.monthly_cost || 0), 0)
    return { monthly, yearly: monthly * 12, count: active.length }
  }, [costs])

  function startEdit(c: Cost) { setEditId(c.id); setDraft({ ...c, monthly_cost: Number(c.monthly_cost) }) }
  function cancelEdit() { setEditId(null); setDraft({}) }

  async function saveEdit() {
    if (!editId) return
    setSavingId(editId)
    try { await api.costs.update(editId, draft); await load(); cancelEdit() }
    catch (e: any) { alert(e.message || 'فشل الحفظ') }
    finally { setSavingId(null) }
  }

  async function toggleActive(c: Cost) {
    setSavingId(c.id)
    try { await api.costs.update(c.id, { is_active: !c.is_active }); await load() }
    finally { setSavingId(null) }
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
      setNewRow({ service_name: '', plan: '', category: 'hosting', monthly_cost: 0, notes: '' })
    } catch (e: any) { alert(e.message || 'فشل الإضافة') }
    finally { setCreating(false) }
  }

  const fmt = (n: number) => n.toLocaleString('ar-SA', { maximumFractionDigits: 2, minimumFractionDigits: 0 })

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="animate-spin text-[#c5a059] mb-4" size={44} />
      <p className="font-bold text-brand-900 dark:text-brand-100">جاري التحميل…</p>
    </div>
  )

  const totalStorageBytes = usage
    ? Number(usage.db.size_bytes)
    : 0
  const filesBytes = usage
    ? Number(usage.files.avatars.bytes) + Number(usage.files.signatures.bytes) +
      Number(usage.files.id_docs.bytes) + Number(usage.files.receipts.bytes)
    : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 flex items-center gap-2">
            <Wallet className="text-[#c5a059]" size={26} /> تكاليف واستهلاك المنصة
          </h1>
          <p className="text-sm text-brand-500 dark:text-brand-400">
            الاستهلاك الفعلي مقروء مباشرة من قاعدة بياناتك. اشتراكات الخدمات تُدخل يدوياً من فواتيرك الحقيقية.
          </p>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-2 bg-slate-100 dark:bg-brand-800 hover:bg-slate-200 dark:hover:bg-brand-700 text-brand-700 dark:text-brand-200 px-3 py-2 rounded-xl text-sm font-bold">
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          تحديث الاستهلاك
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* ── Real usage section ── */}
      {usage && (
        <>
          <div>
            <h2 className="font-bold text-[#1a365d] dark:text-brand-100 text-lg mb-3 flex items-center gap-2">
              <Activity size={18} className="text-[#c5a059]" /> الاستهلاك الفعلي
              <span className="text-xs font-normal text-brand-400">
                (محدّث في {new Date(usage.generated_at).toLocaleString('ar-SA')})
              </span>
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <UsageCard icon={Database} color="text-purple-500" label="حجم قاعدة البيانات" value={usage.db.pretty} note="مساحة فعلية على Postgres" />
              <UsageCard icon={Users} color="text-blue-500" label="إجمالي الأعضاء" value={usage.members.total.toString()} note={`${usage.members.active} نشطون، ${usage.members.pending} قيد المراجعة`} />
              <UsageCard icon={HardDrive} color="text-teal-500" label="الملفات المخزّنة" value={bytesPretty(filesBytes)} note={`${usage.files.avatars.count} صورة، ${usage.files.signatures.count} توقيع، ${usage.files.id_docs.count} هوية`} />
              <UsageCard icon={Receipt} color="text-emerald-500" label="الدفعات" value={usage.payments.this_month.toString()} note={`هذا الشهر • ${usage.payments.total} إجمالي`} />
              <UsageCard icon={Bell} color="text-amber-500" label="الإشعارات" value={usage.notifications.this_month.toString()} note={`هذا الشهر • ${usage.notifications.total} إجمالي`} />
              <UsageCard icon={Mail} color="text-rose-500" label="رسائل التحقق" value={usage.email_verifications.this_month.toString()} note={`هذا الشهر • ${usage.email_verifications.total} إجمالي`} />
              <UsageCard icon={FileText} color="text-indigo-500" label="الخطابات" value={usage.letters.total.toString()} note={`${usage.letters.this_month} هذا الشهر • ${usage.letters.recipients} مستلم`} />
              <UsageCard icon={ServerCog} color="text-slate-500" label="الجلسات النشطة" value={usage.sessions.active.toString()} note={`${usage.sessions.total} إجمالي`} />
            </div>
          </div>

          {/* Top DB tables */}
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-700 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-brand-700 bg-slate-50 dark:bg-brand-950">
              <h3 className="font-bold text-sm text-[#1a365d] dark:text-brand-100">أكبر الجداول في قاعدة البيانات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-brand-500 dark:text-brand-400 bg-slate-50 dark:bg-brand-950">
                  <tr>
                    <th className="text-right px-4 py-2 font-semibold">الجدول</th>
                    <th className="text-right px-3 py-2 font-semibold">الحجم</th>
                    <th className="text-right px-3 py-2 font-semibold">الصفوف (تقريبي)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-brand-700">
                  {usage.db.tables.map((t: any) => (
                    <tr key={t.table_name} className="hover:bg-slate-50/50 dark:hover:bg-brand-800/30">
                      <td className="px-4 py-2 font-mono text-xs text-brand-700 dark:text-brand-300">{t.table_name}</td>
                      <td className="px-3 py-2 font-mono text-xs font-bold text-[#1a365d] dark:text-brand-100">{t.pretty}</td>
                      <td className="px-3 py-2 font-mono text-xs text-brand-500">{Number(t.row_estimate).toLocaleString('ar-SA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configured services */}
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-700 rounded-2xl p-5">
            <h3 className="font-bold text-sm text-[#1a365d] dark:text-brand-100 mb-3">الخدمات الخارجية المُهيّأة</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(usage.services_configured).map(([k, on]) => (
                k === 'public_site_url' ? null : (
                  <div key={k} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-brand-700 px-3 py-2 text-xs">
                    <span className="text-brand-700 dark:text-brand-300 font-semibold">{SERVICE_LABEL[k] || k}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${on
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-brand-800 dark:text-brand-400'}`}>
                      {on ? '✓ مُفعّلة' : '— غير مُهيّأة'}
                    </span>
                  </div>
                )
              ))}
            </div>
            {usage.services_configured.public_site_url && (
              <p className="mt-3 text-[11px] text-brand-400">
                النطاق العام: <span className="font-mono font-bold text-brand-600 dark:text-brand-300">{usage.services_configured.public_site_url}</span>
              </p>
            )}
          </div>
        </>
      )}

      {/* ── External services — auto-fetched ── */}
      {external?.services?.length > 0 && (
        <div>
          <h2 className="font-bold text-[#1a365d] dark:text-brand-100 text-lg mb-3 flex items-center gap-2">
            <Activity size={18} className="text-[#c5a059]" /> اشتراكات الخدمات المُهيّأة
            <span className="text-xs font-normal text-brand-400">(تجلب مباشرة من مزوّدي الخدمة)</span>
          </h2>
          <div className="space-y-2">
            {external.services.map((s: any) => (
              <ExternalRow key={s.service} svc={s} fmt={fmt} />
            ))}
          </div>

          {(() => {
            const liveTotal = external.services
              .filter((s: any) => s.status === 'ok' && s.monthly_sar)
              .reduce((sum: number, s: any) => sum + Number(s.monthly_sar), 0)
            return liveTotal > 0 ? (
              <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
                <span className="font-bold">إجمالي الفواتير الفعلية المقروءة هذا الشهر:</span>
                <span className="font-mono font-black text-lg">{fmt(liveTotal)} ر.س</span>
              </div>
            ) : null
          })()}
        </div>
      )}

      {/* ── Manual subscription costs section ── */}
      <div className="border-t-2 border-slate-100 dark:border-brand-700 pt-6">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <h2 className="font-bold text-[#1a365d] dark:text-brand-100 text-lg flex items-center gap-2">
              <Wallet size={18} className="text-[#c5a059]" /> اشتراكات يدوية إضافية
            </h2>
            <p className="text-xs text-brand-500 dark:text-brand-400">
              لخدمات ليس لها API عام (النطاق، باقة الاستضافة الثابتة، إلخ)
            </p>
          </div>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-2 bg-[#1a365d] hover:bg-[#c5a059] text-white px-4 py-2 rounded-xl font-bold text-sm transition">
            <Plus size={14} /> أضف اشتراكاً
          </button>
        </div>

        {/* Totals (only if there are costs) */}
        {costs.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-gradient-to-br from-[#1a365d] to-[#0a0f1e] text-white rounded-2xl p-5 shadow-lg">
              <p className="text-xs text-[#c5a059] font-bold mb-1">إجمالي الشهري</p>
              <p className="text-3xl font-black">{fmt(totals.monthly)} <span className="text-base font-bold">ر.س</span></p>
              <p className="text-xs text-brand-200 mt-1 opacity-80">{totals.count} اشتراكاً نشطاً</p>
            </div>
            <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-700 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-brand-500 dark:text-brand-400 font-bold mb-1">إجمالي السنوي</p>
              <p className="text-3xl font-black text-[#1a365d] dark:text-brand-100">{fmt(totals.yearly)} <span className="text-base font-bold text-brand-500">ر.س</span></p>
            </div>
          </div>
        )}

        {adding && (
          <div className="bg-[#c5a059]/10 border-2 border-[#c5a059]/40 rounded-2xl p-4 mb-4">
            <h3 className="font-bold text-[#1a365d] dark:text-brand-100 text-sm mb-3 flex items-center gap-2">
              <Plus size={15} /> اشتراك جديد
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
                placeholder="القيمة الشهرية (ر.س)"
                className="border border-slate-200 dark:border-brand-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-brand-900" />
            </div>
            <textarea value={newRow.notes as string || ''}
              onChange={e => setNewRow(r => ({ ...r, notes: e.target.value }))}
              placeholder="ملاحظات (اختياري)" rows={2}
              className="w-full mt-2 border border-slate-200 dark:border-brand-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-brand-900 resize-none" />
            <div className="flex gap-2 mt-3">
              <button onClick={createNew} disabled={creating}
                className="flex-1 bg-[#1a365d] hover:bg-[#c5a059] text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                إضافة
              </button>
              <button onClick={() => setAdding(false)}
                className="px-4 bg-slate-100 dark:bg-brand-800 text-brand-600 dark:text-brand-300 py-2 rounded-lg font-bold text-sm">إلغاء</button>
            </div>
          </div>
        )}

        {/* Costs table */}
        <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-700 rounded-2xl overflow-hidden">
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
                          className={`text-[11px] font-bold px-2 py-1 rounded-lg ${c.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 dark:bg-brand-700 dark:text-brand-300 hover:bg-slate-300'}`}>
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
                              <button onClick={() => startEdit(c)} className="p-1.5 hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-500 rounded">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={() => remove(c)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 rounded">
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
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-brand-400">
                    لا توجد اشتراكات مسجّلة. اضغط "أضف اشتراكاً" لتسجيل القيم من فواتيرك الفعلية.
                  </td></tr>
                )}
              </tbody>
              {costs.length > 0 && (
                <tfoot className="bg-[#1a365d]/5 dark:bg-[#1a365d]/20 border-t-2 border-[#1a365d]/20 dark:border-brand-700 font-bold">
                  <tr>
                    <td className="px-4 py-3 text-[#1a365d] dark:text-brand-100" colSpan={3}>الإجمالي (الاشتراكات النشطة)</td>
                    <td className="px-3 py-3 font-mono text-[#1a365d] dark:text-brand-100">{fmt(totals.monthly)}</td>
                    <td className="px-3 py-3 font-mono text-[#1a365d] dark:text-brand-100">{fmt(totals.yearly)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsageCard({ icon: Icon, color, label, value, note }: {
  icon: any; color: string; label: string; value: string; note?: string
}) {
  return (
    <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-700 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <p className="text-xs font-bold text-brand-500 dark:text-brand-400">{label}</p>
      </div>
      <p className="text-xl font-black text-brand-900 dark:text-brand-100">{value}</p>
      {note && <p className="text-[10px] text-brand-400 mt-0.5">{note}</p>}
    </div>
  )
}

function ExternalRow({ svc, fmt }: { svc: any; fmt: (n: number) => string }) {
  const badge = {
    ok:           { label: 'متصل ✓',          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    needs_token:  { label: 'يحتاج إعداد',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    error:        { label: 'فشل الاتصال',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    no_data:      { label: 'مهيّأ',           color: 'bg-slate-100 text-slate-700 dark:bg-brand-700 dark:text-brand-300' },
  }[svc.status as 'ok' | 'needs_token' | 'error' | 'no_data'] || { label: '—', color: 'bg-slate-100 text-slate-600' }

  return (
    <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-700 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-black text-[#1a365d] dark:text-brand-100">{svc.service}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
          </div>
          <p className="text-xs text-brand-500 dark:text-brand-400">{svc.note}</p>

          {svc.usage && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(svc.usage).map(([k, v]) => (
                <span key={k} className="text-[11px] bg-slate-50 dark:bg-brand-800 border border-slate-100 dark:border-brand-700 rounded-lg px-2 py-1">
                  <span className="text-brand-400">{labelize(k)}:</span>{' '}
                  <span className="font-mono font-bold text-brand-800 dark:text-brand-100">{formatVal(k, v)}</span>
                </span>
              ))}
            </div>
          )}

          {svc.setup_hint && svc.status === 'needs_token' && (
            <p className="mt-2 text-[11px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-1.5 text-amber-700 dark:text-amber-300">
              <strong>كيف تربطها:</strong> {svc.setup_hint}
            </p>
          )}
          {svc.error && (
            <p className="mt-2 text-[11px] text-red-600 dark:text-red-400 font-mono">{svc.error}</p>
          )}
        </div>

        <div className="text-left shrink-0">
          {svc.monthly_sar != null ? (
            <>
              <p className="text-[10px] text-brand-400">شهري (ر.س)</p>
              <p className="text-2xl font-black text-[#1a365d] dark:text-brand-100">{fmt(Number(svc.monthly_sar))}</p>
            </>
          ) : (
            <span className="text-xs text-brand-300">—</span>
          )}
        </div>
      </div>
    </div>
  )
}

function labelize(k: string): string {
  const map: Record<string, string> = {
    payments_this_month:  'دفعات هذا الشهر',
    amount_processed_sar: 'المبلغ المعالج (ر.س)',
    blobs:                'ملف',
    total_bytes:          'إجمالي البايتات',
    total_gb:             'إجمالي (GB)',
  }
  return map[k] || k
}
function formatVal(k: string, v: any): string {
  if (k === 'total_bytes') {
    const n = Number(v)
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
  }
  if (typeof v === 'number') return v.toLocaleString('ar-SA')
  return String(v)
}
