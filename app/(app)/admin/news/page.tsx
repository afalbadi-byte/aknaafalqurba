'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { NEWS_CATEGORIES, formatDate } from '@/lib/utils'
import { Plus, Edit3, Trash2, Pin, Globe, Loader2, Upload } from 'lucide-react'
import Modal from '@/components/modal'

const TOP_ADMIN = ['admin','president']

export default function AdminNews() {
  const [user, setUser] = useState<any>(null)
  const [list, setList] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<any>(blank())
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    api.auth.me().then(r => setUser(r.user))
    load()
  }, [])
  async function load() { const r = await api.news.list(); setList(r.news) }

  function blank() {
    return { title: '', category: 'general', summary: '', body: '', is_pinned: false, is_public: false }
  }
  function openCreate() { setEdit(null); setForm(blank()); setFile(null); setOpen(true) }
  function openEdit(n: any) {
    setEdit(n)
    setForm({
      title: n.title, category: n.category, summary: n.summary || '',
      body: '', is_pinned: !!n.is_pinned, is_public: !!n.is_public,
    })
    api.news.get(n.id).then(r => setForm((f: any) => ({ ...f, body: r.news.body })))
    setFile(null); setOpen(true)
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
        else if (v !== '' && v !== null) fd.append(k, String(v))
      })
      if (file) fd.append('cover_image', file)
      if (edit) await api.news.update(edit.id, fd)
      else      await api.news.create(fd)
      setOpen(false); load()
    } finally { setBusy(false) }
  }
  async function remove(id: number) {
    if (!confirm('حذف الخبر؟')) return
    await api.news.remove(id); load()
  }
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const isAdmin = user && TOP_ADMIN.includes(user.role)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950">إدارة الأخبار</h1>
          <p className="text-brand-600 text-sm">نشر إعلانات ومناسبات العائلة</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> خبر جديد</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(n => (
          <div key={n.id} className="card overflow-hidden">
            {n.cover_image
              /* eslint-disable-next-line @next/next/no-img-element */
              && <img src={n.cover_image} className="w-full h-40 object-cover" alt={n.title} />
            }
            <div className="p-4">
              <div className="flex items-center gap-1 flex-wrap mb-2">
                <span className="badge badge-info">{NEWS_CATEGORIES[n.category]}</span>
                {n.is_pinned && <span className="badge badge-gold"><Pin size={12} /></span>}
                {n.is_public && <span className="badge badge-approved"><Globe size={12} /> عام</span>}
              </div>
              <h3 className="font-bold text-brand-950 line-clamp-2 mb-1">{n.title}</h3>
              {n.summary && <p className="text-sm text-brand-600 line-clamp-2 mb-2">{n.summary}</p>}
              <div className="text-xs text-brand-400 mb-3">{formatDate(n.published_at)}</div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(n)} className="btn-secondary flex-1 !py-1.5 text-xs"><Edit3 size={14} /> تعديل</button>
                {isAdmin && (
                  <button onClick={() => remove(n.id)} className="btn-danger !py-1.5 !px-3 text-xs"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 card card-body text-center text-brand-500">لا توجد أخبار</div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'تعديل خبر' : 'خبر جديد'} size="xl">
        <form onSubmit={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">العنوان *</label>
              <input className="input" required value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="label">التصنيف</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {Object.entries(NEWS_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4 pt-7">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_pinned} onChange={e => set('is_pinned', e.target.checked)} /> مثبّت
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_public} onChange={e => set('is_public', e.target.checked)} /> ظاهر للزوار
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="label">ملخص</label>
              <input className="input" maxLength={400} value={form.summary} onChange={e => set('summary', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">المحتوى *</label>
              <textarea className="input" rows={10} required value={form.body} onChange={e => set('body', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">صورة الغلاف</label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-brand-200 rounded-lg py-4 cursor-pointer hover:bg-brand-50">
                <Upload size={18} className="text-brand-500" />
                <span className="text-sm text-brand-700">{file ? file.name : 'اضغط لاختيار صورة'}</span>
                <input type="file" hidden accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" size={16} />} {edit ? 'حفظ التعديلات' : 'نشر الخبر'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
