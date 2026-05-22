'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import { ROLE_LABELS, STATUS_LABELS, statusBadge, formatDate } from '@/lib/utils'
import { CheckCircle, UserCog, Ban, ShieldCheck, Search, MailCheck, FileText, Loader2 } from 'lucide-react'
import Modal from '@/components/modal'
import { Avatar } from '@/components/app-shell'

const TOP_ADMIN = ['admin','president']

export default function Members() {
  const params = useSearchParams()
  const [user, setUser]     = useState<any>(null)
  const [list, setList]     = useState<any[]>([])
  const [filter, setFilter] = useState(params.get('status') || '')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)

  // ID document viewer
  const [docMember,  setDocMember]  = useState<any>(null)
  const [docData,    setDocData]    = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [docError,   setDocError]   = useState('')

  const isAdmin = user && TOP_ADMIN.includes(user.role)

  useEffect(() => { api.auth.me().then(r => setUser(r.user)) }, [])
  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    try { const r = await api.members.list(filter || undefined); setList(r.members) }
    finally { setLoading(false) }
  }

  async function approve(id: number) { await api.members.approve(id); load() }
  async function suspend(id: number) { if (confirm('إيقاف الحساب؟')) { await api.members.setStatus(id, 'suspended'); load() } }
  async function activate(id: number){ await api.members.setStatus(id, 'active'); load() }
  async function setRole(id: number, role: string) { await api.members.setRole(id, role); load(); setEditing(null) }
  async function verifyEmail(id: number) {
    await api.members.verifyEmailAdmin(id)
    load()
  }

  async function openDoc(m: any) {
    setDocMember(m)
    setDocData(null)
    setDocError('')
    setDocLoading(true)
    try {
      const r = await api.members.idDocument(m.id)
      setDocData(r.id_document)
    } catch (e: any) {
      setDocError(e.message || 'تعذّر تحميل المستند')
    } finally {
      setDocLoading(false)
    }
  }

  const filtered = list.filter(m =>
    !search || m.full_name.includes(search) || m.phone.includes(search) || (m.email || '').includes(search)
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">إدارة الأعضاء</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">قبول الطلبات، تعديل الصلاحيات، وإدارة الحسابات</p>
      </div>

      <div className="card card-body flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {[
            { v: '', l: 'الكل' },
            { v: 'pending', l: 'بانتظار التفعيل' },
            { v: 'active', l: 'مفعّلون' },
            { v: 'suspended', l: 'موقوفون' },
          ].map(t => (
            <button key={t.v} onClick={() => setFilter(t.v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                filter === t.v
                  ? 'bg-brand-950 dark:bg-gold-500 text-white dark:text-brand-950'
                  : 'bg-brand-50 dark:bg-brand-800 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-700'
              }`}>
              {t.l}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pr-9" placeholder="بحث..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && <div className="p-8 text-center text-brand-500 dark:text-brand-400">جاري التحميل...</div>}
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
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-brand-50/30 dark:hover:bg-brand-800/40">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.full_name} src={m.avatar} size={36} />
                        <div>
                          <div className="font-bold text-brand-950 dark:text-brand-50">{m.full_name}</div>
                          {m.national_id && (
                            <div className="text-xs text-brand-400 dark:text-brand-500 font-mono">{m.national_id}</div>
                          )}
                          {m.email && (
                            <div className="text-xs text-brand-500 dark:text-brand-400 flex items-center gap-1">
                              {m.email}
                              {!m.email_verified && (
                                <span className="text-amber-500 font-semibold">(غير مؤكد)</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-brand-700 dark:text-brand-300">{m.branch || '—'}</td>
                    <td className="p-3 font-mono text-xs text-brand-600 dark:text-brand-400">{m.phone}</td>
                    <td className="p-3"><span className="badge badge-info">{ROLE_LABELS[m.role]}</span></td>
                    <td className="p-3"><span className={statusBadge(m.status)}>{STATUS_LABELS[m.status]}</span></td>
                    <td className="p-3 text-brand-600 dark:text-brand-400">{formatDate(m.created_at)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {m.status === 'pending' && (
                          <button onClick={() => approve(m.id)} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded" title="تفعيل">
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setEditing(m)} className="p-2 hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-700 dark:text-brand-300 rounded" title="تعديل الدور">
                            <UserCog size={16} />
                          </button>
                        )}
                        {m.status === 'active' && isAdmin && (
                          <button onClick={() => suspend(m.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded" title="إيقاف"><Ban size={16} /></button>
                        )}
                        {m.status === 'suspended' && isAdmin && (
                          <button onClick={() => activate(m.id)} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded" title="تفعيل"><ShieldCheck size={16} /></button>
                        )}
                        {m.email && !m.email_verified && isAdmin && (
                          <button onClick={() => verifyEmail(m.id)} className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded" title="تفعيل البريد الإلكتروني يدوياً">
                            <MailCheck size={16} />
                          </button>
                        )}
                        {m.has_id_document && (
                          <button onClick={() => openDoc(m)} className="p-2 hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-500 dark:text-brand-400 rounded" title="عرض صورة الهوية">
                            <FileText size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-brand-500 dark:text-brand-400">لا توجد بيانات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`تعديل دور: ${editing?.full_name}`}>
        {editing && (
          <div className="space-y-2">
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setRole(editing.id, k)}
                className={`w-full text-right px-4 py-3 rounded-lg border transition ${
                  editing.role === k
                    ? 'border-gold-400 bg-brand-50 dark:bg-brand-800 text-brand-950 dark:text-brand-50 font-bold'
                    : 'border-brand-100 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-800 dark:text-brand-200'
                }`}>{v}</button>
            ))}
          </div>
        )}
      </Modal>

      {/* ID Document viewer modal */}
      <Modal open={!!docMember} onClose={() => { setDocMember(null); setDocData(null); setDocError('') }}
        title={`هوية: ${docMember?.full_name}`}>
        <div className="min-h-[200px] flex items-center justify-center">
          {docLoading && (
            <div className="flex flex-col items-center gap-2 text-brand-500">
              <Loader2 size={32} className="animate-spin" />
              <span className="text-sm">جاري تحميل المستند...</span>
            </div>
          )}
          {!docLoading && docError && (
            <p className="text-red-600 text-sm text-center">{docError}</p>
          )}
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
