'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { AID_TYPES } from '@/lib/utils'
import { Loader2, Upload, ArrowRight, Lock } from 'lucide-react'

export default function AidNew() {
  const router = useRouter()
  const [form, setForm] = useState({
    aid_type: 'medical', title: '', description: '',
    requested_amount: '', dependents_count: '', monthly_income: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, String(v)) })
      if (file) fd.append('attachment', file)
      const r = await api.aid.create(fd)
      router.push(`/aid/${r.id}`)
    } catch (err: any) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/aid" className="text-sm text-brand-600 hover:text-brand-950 flex items-center gap-1 mb-2">
          <ArrowRight size={14} /> العودة لطلباتي
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-brand-950">طلب معونة جديد</h1>
        <p className="text-brand-600 text-sm">سيتم استلام طلبك ومراجعته من قبل لجنة المعونات</p>
      </div>

      <div className="card card-body bg-gold-50/40 border-gold-200">
        <div className="flex items-start gap-3">
          <Lock className="text-gold-700 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-brand-800">
            <strong className="text-gold-800">سرية تامة:</strong> لا يطّلع على هذا الطلب سوى أعضاء لجنة المعونات.
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card card-body space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">نوع المعونة *</label>
            <select className="input" value={form.aid_type} onChange={e => set('aid_type', e.target.value)} required>
              {Object.entries(AID_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">عنوان مختصر *</label>
            <input className="input" required maxLength={200}
              placeholder="مثال: مساعدة في علاج الوالد"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">تفاصيل الطلب *</label>
            <textarea className="input" rows={6} required
              placeholder="اشرح الحالة بالتفصيل..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="label">المبلغ المطلوب (ر.س)</label>
            <input className="input" type="number" min="0" step="1"
              value={form.requested_amount} onChange={e => set('requested_amount', e.target.value)} />
          </div>
          <div>
            <label className="label">عدد المعالين</label>
            <input className="input" type="number" min="0"
              value={form.dependents_count} onChange={e => set('dependents_count', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">الدخل الشهري التقريبي (ر.س)</label>
            <input className="input" type="number" min="0" step="100"
              value={form.monthly_income} onChange={e => set('monthly_income', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">مرفق داعم (اختياري)</label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-brand-200 rounded-lg py-6 cursor-pointer hover:bg-brand-50 transition">
              <Upload className="text-brand-500" size={20} />
              <span className="text-sm text-brand-700">{file ? file.name : 'تقرير طبي / وثيقة / صورة'}</span>
              <input type="file" hidden accept="image/*,application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
        <button className="btn-primary w-full !py-3" type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" size={18} />} تقديم الطلب
        </button>
      </form>
    </div>
  )
}
