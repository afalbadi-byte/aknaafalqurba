'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { ROLE_LABELS, STATUS_LABELS, statusBadge, formatDate } from '@/lib/utils'
import {
  CheckCircle, UserCog, Ban, ShieldCheck, Search,
  MailCheck, FileText, Loader2, BrainCircuit, BadgeCheck, Trash2,
} from 'lucide-react'
import Modal from '@/components/modal'
import { Avatar } from '@/components/app-shell'

const TOP_ADMIN = ['admin', 'president']

export default function Members() {
  const [user,    setUser]    = useState<any>(null)
  const [all,     setAll]     = useState<any[]>([])
  const [filter,  setFilter]  = useState<'all' | 'active' | 'inactive'>('all')
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<any>(null)  // member to confirm-delete
  const [delBusy,  setDelBusy]  = useState(false)

  // ID document viewer
  const [docMember,  setDocMember]  = useState<any>(null)
  const [docData,    setDocData]    = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [docError,   setDocError]   = useState('')

  // AI verification
  const [aiVerifying, setAiVerifying] = useState<number | null>(null)
  const [aiResult,    setAiResult]    = useState<any>(null)

  const isAdmin = user && TOP_ADMIN.includes(user.role)

  useEffect(() => { api.auth.me().then(r => setUser(r.user)) }, [])
  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { const r = await api.members.list(); setAll(r.members) }
    finally { setLoading(false) }
  }

  // ── Client-side filter ──────────────────────────────────────────────────
  const list = all.filter(m => {
    if (filter === 'active')   return m.status === 'active'
    if (filter === 'inactive') return m.status !== 'active'
    return true
  }).filter(m =>
    !search ||
    m.full_name.includes(search) ||
    m.phone.includes(search) ||
    (m.national_id || '').includes(search) ||
    (m.email || '').includes(search)
  )

  // ── Actions ─────────────────────────────────────────────────────────────
  async function approve(id: number)  { await api.members.approve(id); load() }
  async function suspend(id: number)  { await api.members.setStatus(id, 'suspended'); load() }
  async function activate(id: number) { await api.members.setStatus(id, 'active'); load() }
  async function setRole(id: number, role: string) { await api.members.setRole(id, role); load(); setEditing(null) }
  async function verifyEmail(id: number) { await api.members.verifyEmailAdmin(id); load() }

  async function confirmDelete() {
    if (!deleting) return
    setDelBusy(true)
    try {
      await api.members.delete(deleting.id)
      setDeleting(null)
      load()
    } catch (e: any) {
      alert(e.message || 'فشل الحذف')
    } finally {
      setDelBusy(false)
    }
  }

  async function runAiVerify(m: any) {
    setAiVerifying(m.id)
    setAiResult(null)
    try {
      const r = await api.auth.verifyId(m.id)
      setAiResult({ member: m, ...r.result, updated_fields: r.updated_fields || [] })
      load()
    } catch (e: any) {
      setAiResult({ member: m, error: e.message })
    } finally {
      setAiVerifying(null)
    }
  }

  async function openDoc(m: any) {
    setDocMember(m); setDocData(null); setDocError(''); setDocLoading(true)
    try {
      const r = await api.members.idDocument(m.id)
      setDocData(r.id_document)
    } catch (e: any) {
      setDocError(e.message || 'تعذّر تحميل المستند')
    } finally {
      setDocLoading(false)
    }
  }

  // ── Filter tabs ──────────────────────────────────────────────────────────
  const counts = {
    all:      all.length,
    active:   all.filter(m => m.status === 'active').length,
    inactive: all.filter(m => m.status !== 'active').length,
  }

  const TABS = [
    { v: 'all'      as const, l: 'الكل',      count: counts.all      },
    { v: 'active'   as const, l: 'نشط',       count: counts.active   },
    { v: 'inactive' as const, l: 'غير نشط',   count: counts.inactive },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">إدارة الأعضاء</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">قبول الطلبات، تعديل الصلاحيات، وإدارة الحسابات</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="card card-body flex flex-wrap items-center gap-3">
        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 bg-brand-100 dark:bg-brand-800 p-1 rounded-xl">
          {TABS.map(t => (
            <button key={t.v} onClick={() => setFilter(t.v)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                filter === t.v
                  ? 'bg-white dark:bg-brand-700 text-brand-950 dark:text-brand-50 shadow-sm'
                  : 'text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-brand-100'
              }`}>
              {t.l}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                filter === t.v
                  ? 'bg-brand-100 dark:bg-brand-600 text-brand-700 dark:text-brand-200'
                  : 'bg-brand-200 dark:bg-brand-700 text-brand-500 dark:text-brand-400'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pr-9" placeholder="بحث بالاسم أو الجوال أو الهوية..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {loading && <div className="p-8 text-center text-brand-500">جاري التحميل...</div>}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 dark:bg-brand-800 text-brand-700 dark:text-brand-300 text-xs">
                <tr>
                  <th className="text-right p-3 font-semibold">الاسم</th>
                  <th className="text-right p-3 font-semibold">الفرع</th>
                  <th className="text-right p-3 font-semibold">الجوال</th>
                  <th className="text-right p-3 font-semibold">الدور</th>
                  <th className="text-right p-3 font-semibold">الحالة</th>
                  <th className="text-right p-3 font-semibold">تاريخ التسجيل</th>
                  <th className="text-right p-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50 dark:divide-brand-800">
                {list.map(m => (
                  <tr key={m.id} className="hover:bg-brand-50/30 dark:hover:bg-brand-800/40">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.full_name} src={m.avatar} size={36} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-brand-950 dark:text-brand-50">{m.full_name}</span>
                            {m.id_verified && (
                              <span title="تم التحقق من الهوية">
                                <BadgeCheck size={14} className="text-emerald-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          {m.national_id && (
                            <div className="text-xs text-brand-400 dark:text-brand-500 font-mono">{m.national_id}</div>
                          )}
                          {m.email && (
                            <div className="text-xs text-brand-500 dark:text-brand-400 flex items-center gap-1">
                              {m.email}
                              {!m.email_verified && <span className="text-amber-500 font-semibold">(غير مؤكد)</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-brand-700 dark:text-brand-300">{m.branch || '—'}</td>
                    <td className="p-3 font-mono text-xs text-brand-600 dark:text-brand-400">{m.phone}</td>
                    <td className="p-3"><span className="badge badge-info">{ROLE_LABELS[m.role]}</span></td>
                    <td className="p-3">
                      <span className={`badge ${statusBadge(m.status)}`}>{STATUS_LABELS[m.status] || m.status}</span>
                    </td>
                    <td className="p-3 text-brand-600 dark:text-brand-400">{formatDate(m.created_at)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {m.status === 'pending' && (
                          <button onClick={() => approve(m.id)} title="تفعيل"
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 rounded">
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setEditing(m)} title="تعديل الدور"
                            className="p-1.5 hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-500 rounded">
                            <UserCog size={16} />
                          </button>
                        )}
                        {m.status === 'active' && isAdmin && (
                          <button onClick={() => suspend(m.id)} title="إيقاف"
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded">
                            <Ban size={16} />
                          </button>
                        )}
                        {m.status === 'suspended' && isAdmin && (
                          <button onClick={() => activate(m.id)} title="تفعيل"
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 rounded">
                            <ShieldCheck size={16} />
                          </button>
                        )}
                        {m.email && !m.email_verified && isAdmin && (
                          <button onClick={() => verifyEmail(m.id)} title="تفعيل البريد يدوياً"
                            className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-500 rounded">
                            <MailCheck size={16} />
                          </button>
                        )}
                        {m.has_id_document && (
                          <button onClick={() => openDoc(m)} title="عرض صورة الهوية"
                            className="p-1.5 hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-400 rounded">
                            <FileText size={16} />
                          </button>
                        )}
                        {m.has_id_document && isAdmin && (
                          <button onClick={() => runAiVerify(m)} disabled={aiVerifying === m.id}
                            title="تحقق بالذكاء الاصطناعي"
                            className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-500 rounded disabled:opacity-40">
                            {aiVerifying === m.id
                              ? <Loader2 size={16} className="animate-spin" />
                              : <BrainCircuit size={16} />}
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setDeleting(m)} title="حذف العضو نهائياً"
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 rounded">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-brand-400">لا توجد بيانات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Role edit modal ── */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`تعديل دور: ${editing?.full_name}`}>
        {editing && (
          <div className="space-y-2">
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setRole(editing.id, k)}
                className={`w-full text-right px-4 py-3 rounded-lg border transition ${
                  editing.role === k
                    ? 'border-gold-400 bg-brand-50 dark:bg-brand-800 font-bold text-brand-950 dark:text-brand-50'
                    : 'border-brand-100 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-800 dark:text-brand-200'
                }`}>{v}</button>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Delete confirm modal ── */}
      <Modal open={!!deleting} onClose={() => !delBusy && setDeleting(null)} title="حذف العضو نهائياً">
        {deleting && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
              <p className="font-bold mb-1">⚠️ هذا الإجراء لا يمكن التراجع عنه</p>
              <p>سيتم حذف <strong>{deleting.full_name}</strong> وجميع بياناته: أفراد العائلة، سجل التحقق، والصلاحيات.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDelete} disabled={delBusy}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">
                {delBusy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                نعم، احذف نهائياً
              </button>
              <button onClick={() => setDeleting(null)} disabled={delBusy}
                className="flex-1 btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── AI verification result modal ── */}
      <Modal open={!!aiResult} onClose={() => setAiResult(null)} title={`نتيجة التحقق: ${aiResult?.member?.full_name}`}>
        {aiResult && (
          <div className="space-y-3 text-sm">
            {aiResult.error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-xl px-4 py-3">{aiResult.error}</div>
            ) : (
              <>
                {/* Status banner */}
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 font-bold ${aiResult.verified ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700'}`}>
                  {aiResult.verified ? <BadgeCheck size={18} /> : <span className="text-lg">✗</span>}
                  {aiResult.verified ? 'تم التحقق — البادي ✓ — رقم الهوية متطابق ✓' : 'لم يتم التحقق'}
                </div>

                {/* Extracted data grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-brand-50 dark:bg-brand-800 rounded-xl p-3 col-span-2">
                    <div className="text-xs text-brand-500 dark:text-brand-400 mb-1">الاسم المستخرج</div>
                    <div className="font-semibold text-brand-900 dark:text-brand-100">{aiResult.extracted_name || '—'}</div>
                  </div>
                  <div className="bg-brand-50 dark:bg-brand-800 rounded-xl p-3">
                    <div className="text-xs text-brand-500 dark:text-brand-400 mb-1">رقم الهوية</div>
                    <div className="font-mono font-semibold text-brand-900 dark:text-brand-100 text-xs">{aiResult.extracted_id || '—'}</div>
                  </div>
                  <div className="bg-brand-50 dark:bg-brand-800 rounded-xl p-3">
                    <div className="text-xs text-brand-500 dark:text-brand-400 mb-1">تاريخ الميلاد</div>
                    <div className="font-semibold text-brand-900 dark:text-brand-100">{aiResult.extracted_birth_date || '—'}</div>
                  </div>
                  <div className={`rounded-xl p-3 ${aiResult.is_badi ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
                    <div className="text-xs mb-1">عائلة البادي</div>
                    <div className="font-bold">{aiResult.is_badi ? '✓ نعم' : '✗ لا'}</div>
                  </div>
                  <div className={`rounded-xl p-3 ${aiResult.id_matches ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
                    <div className="text-xs mb-1">الجنس</div>
                    <div className="font-bold">{aiResult.extracted_gender === 'male' ? 'ذكر' : aiResult.extracted_gender === 'female' ? 'أنثى' : '—'}</div>
                  </div>
                </div>

                {/* Updated fields */}
                {aiResult.verified && aiResult.updated_fields?.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3">
                    <p className="font-bold text-blue-700 dark:text-blue-300 mb-1.5 text-xs">✦ تم تحديث الملف الشخصي بالبيانات المستخرجة:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(aiResult.updated_fields as string[]).map((f: string) => {
                        const labels: Record<string, string> = {
                          full_name: 'الاسم الكامل', national_id: 'رقم الهوية',
                          birth_date: 'تاريخ الميلاد', gender: 'الجنس',
                        }
                        return (
                          <span key={f} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-semibold">
                            {labels[f] || f}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {aiResult.verified && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-semibold">
                    ✓ تم تفعيل العضوية وتحديث بيانات الملف الشخصي تلقائياً
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ── ID Document viewer modal ── */}
      <Modal open={!!docMember} onClose={() => { setDocMember(null); setDocData(null); setDocError('') }}
        title={`هوية: ${docMember?.full_name}`}>
        <div className="min-h-[200px] flex items-center justify-center">
          {docLoading && <div className="flex flex-col items-center gap-2 text-brand-500"><Loader2 size={32} className="animate-spin" /><span className="text-sm">جاري التحميل...</span></div>}
          {!docLoading && docError && <p className="text-red-600 text-sm text-center">{docError}</p>}
          {!docLoading && docData && (
            docData.startsWith('data:image')
              ? <img src={docData} alt="صورة الهوية" className="w-full rounded-lg" />
              : <iframe src={docData} title="هوية" className="w-full h-[500px] rounded-lg border border-brand-100 dark:border-brand-700" />
          )}
        </div>
      </Modal>
    </div>
  )
}
