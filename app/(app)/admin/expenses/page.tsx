'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { formatMoney, formatDate } from '@/lib/utils'
import { Plus, Trash2, Upload, Loader2 } from 'lucide-react'
import Modal from '@/components/modal'

const TOP_ADMIN = ['admin','president']

export default function Expenses() {
  const [user, setUser]   = useState<any>(null)
  const [list, setList]   = useState<any[]>([])
  const [open, setOpen]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]   = useState(false)
  const [form, setForm]   = useState<any>({
    title: '', category: '', amount: '', expense_date: new Date().toISOString().slice(0, 10),
    recipient: '', description: '',
  })
  const [file, setFile]   = useState<File | null>(null)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  useEffect(() => {
    api.auth.me().then(r => setUser(r.user))
    load()
  }, [])
  async function load() {
    setLoading(true)
    try { const r = await api.expenses.list(); setList(r.expenses) }
    finally { setLoading(false) }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, String(v)) })
      if (file) fd.append('attachment', file)
      await api.expenses.create(fd)
      setOpen(false); setFile(null)
      setForm({ title: '', category: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), recipient: '', description: '' })
      load()
    } finally { setBusy(false) }
  }
  async function remove(id: number) {
    if (!confirm('حذف هذا المصروف؟')) return
    await api.expenses.remove(id); load()
  }
  const total = list.reduce((s, e) => s + Number(e.amount || 0), 0)
  const isAdmin = user && TOP_ADMIN.includes(user.role)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">المصروفات</h1>
          <p className="text-brand-600 dark:text-brand-400 text-sm">إجمالي: <strong className="text-red-700 dark:text-red-400">{formatMoney(total)}</strong></p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> مصروف جديد</button>
      </div>

      <div className="card overflow-hidden">
        {loading && <div className="p-8 text-center text-brand-500 dark:text-brand-400">جاري التحميل...</div>}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 dark:bg-brand-800 text-brand-700 dark:text-brand-300 text-xs">
                <tr>
                  <th className="text-right p-3 font-semibold">التاريخ</th>
                  <th className="text-right p-3 font-semibold">العنوان</th>
                  <th className="text-right p-3 font-semibold">التصنيف</th>
                  <th className="text-right p-3 font-semibold">المستفيد</th>
                  <th className="text-right p-3 font-semibold">المبلغ</th>
                  <th className="text-right p-3 font-semibold">مرفق</th>
                  <th className="text-right p-3 font-semibold">المسجّل</th>
                  <th className="text-right p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50 dark:divide-brand-800">
                {list.map(e => (
                  <tr key={e.id} className="hover:bg-brand-50/30 dark:hover:bg-brand-800/40">
                    <td className="p-3 text-brand-700 dark:text-brand-300">{formatDate(e.expense_date)}</td>
                    <td className="p-3 font-semibold text-brand-950 dark:text-brand-50">{e.title}</td>
                    <td className="p-3 text-brand-700 dark:text-brand-300">{e.category || '—'}</td>
                    <td className="p-3 text-brand-700 dark:text-brand-300">{e.recipient || '—'}</td>
                    <td className="p-3 font-bold text-red-700 dark:text-red-400">{formatMoney(e.amount)}</td>
                    <td className="p-3">
                      {e.attachment
                        ? <a href={e.attachment} target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">عرض</a>
                        : <span className="text-brand-300 dark:text-brand-600">—</span>}
                    </td>
                    <td className="p-3 text-brand-600 dark:text-brand-400 text-xs">{e.creator_name}</td>
                    <td className="p-3">
                      {isAdmin && (
                        <button onClick={() => remove(e.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-brand-500 dark:text-brand-400">لا توجد مصروفات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="مصروف جديد" size="lg">
        <form onSubmit={create} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">العنوان *</label>
            <input className="input" required value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label className="label">المبلغ (ر.س) *</label>
            <input className="input" type="number" step="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div>
            <label className="label">التاريخ *</label>
            <input className="input" type="date" required value={form.expense_date} onChange={e => set('expense_date', e.target.value)} />
          </div>
          <div>
            <label className="label">التصنيف</label>
            <input className="input" placeholder="دعم، إدارية..." value={form.category} onChange={e => set('category', e.target.value)} />
          </div>
          <div>
            <label className="label">المستفيد</label>
            <input className="input" value={form.recipient} onChange={e => set('recipient', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">الوصف</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">مرفق</label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-brand-200 dark:border-brand-700 rounded-lg py-4 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-800">
              <Upload size={18} className="text-brand-500 dark:text-brand-400" />
              <span className="text-sm text-brand-700 dark:text-brand-300">{file ? file.name : 'اضغط لاختيار ملف'}</span>
              <input type="file" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <button className="sm:col-span-2 btn-primary" type="submit" disabled={busy}>
            {busy && <Loader2 className="animate-spin" size={16} />} حفظ
          </button>
        </form>
      </Modal>
    </div>
  )
}
