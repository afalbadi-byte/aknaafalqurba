'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { relativeTime, formatDate } from '@/lib/utils'
import { RefreshCw, Search } from 'lucide-react'

/* ── Action label + colour map ── */
const ACTION_META: Record<string, { label: string; color: string }> = {
  'auth.login':             { label: 'تسجيل دخول',        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
  'auth.login_failed':      { label: 'فشل دخول',           color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' },
  'auth.logout':            { label: 'تسجيل خروج',         color: 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-800' },
  'auth.register':          { label: 'تسجيل جديد',         color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' },
  'auth.password_change':   { label: 'تغيير كلمة المرور',  color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' },
  'member.approve':         { label: 'تفعيل عضو',          color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
  'member.status_change':   { label: 'تغيير حالة عضو',     color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' },
  'member.role_change':     { label: 'تغيير دور عضو',      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30' },
  'member.email_verify_admin': { label: 'تحقق بريد يدوي', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' },
  'payment.create':         { label: 'دفعة جديدة',         color: 'text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-900/30' },
  'payment.approved':       { label: 'اعتماد دفعة',        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
  'payment.rejected':       { label: 'رفض دفعة',           color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' },
  'payment.delete':         { label: 'حذف دفعة',           color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40' },
  'expense.create':         { label: 'مصروف جديد',         color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30' },
  'expense.delete':         { label: 'حذف مصروف',          color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40' },
  'aid.create':             { label: 'طلب دعم',          color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30' },
  'aid.status_change':      { label: 'تحديث دعم',        color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30' },
  'news.create':            { label: 'خبر جديد',           color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' },
  'news.update':            { label: 'تعديل خبر',          color: 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' },
  'news.delete':            { label: 'حذف خبر',            color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40' },
  'settings.update':        { label: 'تحديث الإعدادات',    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30' },
}

const FILTERS = [
  { v: '',        l: 'الكل' },
  { v: 'auth',    l: 'المصادقة' },
  { v: 'member',  l: 'الأعضاء' },
  { v: 'payment', l: 'الدفعات' },
  { v: 'expense', l: 'المصروفات' },
  { v: 'aid',     l: 'الدعم' },
  { v: 'news',    l: 'الأخبار' },
  { v: 'settings',l: 'الإعدادات' },
]

export default function LogsPage() {
  const [logs,    setLogs]    = useState<any[]>([])
  const [filter,  setFilter]  = useState('')
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    try {
      const url = `/api/logs${filter ? `?action=${filter}` : ''}`
      const r   = await fetch(url, { credentials: 'same-origin' })
      const d   = await r.json()
      setLogs(d.logs ?? [])
    } catch { setLogs([]) }
    finally  { setLoading(false) }
  }

  const filtered = logs.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (l.member_name || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.ip || '').includes(q) ||
      (l.entity || '').toLowerCase().includes(q)
    )
  })

  function actionBadge(action: string) {
    const m = ACTION_META[action]
    if (m) return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${m.color}`}>{m.label}</span>
    // fallback for unknown actions
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-800">{action}</span>
  }

  function detailsText(raw: string | null) {
    if (!raw) return null
    try {
      const obj = JSON.parse(raw)
      return Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ')
    } catch { return raw }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">سجل النشاط</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">جميع الإجراءات والتحركات في المنصة</p>
      </div>

      {/* Filters */}
      <div className="card card-body flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                filter === f.v
                  ? 'bg-brand-950 dark:bg-gold-500 text-white dark:text-brand-950'
                  : 'bg-brand-50 dark:bg-brand-800 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-700'
              }`}>{f.l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400" />
            <input className="input pr-9 text-sm" placeholder="بحث بالاسم أو الإجراء أو IP..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={load} title="تحديث"
            className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-600 dark:text-brand-400">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading && <div className="p-8 text-center text-brand-500 dark:text-brand-400">جاري التحميل...</div>}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 dark:bg-brand-800 text-brand-700 dark:text-brand-300 text-xs">
                <tr>
                  <th className="text-right p-3 font-semibold">الوقت</th>
                  <th className="text-right p-3 font-semibold">المستخدم</th>
                  <th className="text-right p-3 font-semibold">الإجراء</th>
                  <th className="text-right p-3 font-semibold">التفاصيل</th>
                  <th className="text-right p-3 font-semibold">الـ IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50 dark:divide-brand-800">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-brand-50/30 dark:hover:bg-brand-800/30">
                    <td className="p-3 text-brand-500 dark:text-brand-400 whitespace-nowrap">
                      <div className="text-xs">{relativeTime(l.created_at)}</div>
                      <div className="text-[11px] text-brand-400 dark:text-brand-500">{formatDate(l.created_at, true)}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-brand-900 dark:text-brand-100 text-sm">
                        {l.member_name || <span className="text-brand-400 dark:text-brand-600 italic">غير معروف</span>}
                      </div>
                      {l.member_id && <div className="text-[11px] text-brand-400">#{l.member_id}</div>}
                    </td>
                    <td className="p-3">{actionBadge(l.action)}</td>
                    <td className="p-3 text-brand-600 dark:text-brand-400 text-xs max-w-xs truncate">
                      {l.entity && (
                        <span className="text-brand-400 dark:text-brand-500 ml-1">
                          {l.entity}#{l.entity_id}
                        </span>
                      )}
                      {detailsText(l.details)}
                    </td>
                    <td className="p-3 font-mono text-xs text-brand-500 dark:text-brand-500">
                      {l.ip || '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-brand-400 dark:text-brand-600">
                      لا توجد سجلات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="p-3 border-t border-brand-50 dark:border-brand-800 text-xs text-brand-400 dark:text-brand-600 text-center">
            {filtered.length} سجل — آخر {logs.length} حدث
          </div>
        )}
      </div>
    </div>
  )
}
