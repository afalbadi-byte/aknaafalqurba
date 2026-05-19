'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import Logo from '@/components/logo'

export default function SetupPage() {
  const [checking, setChecking] = useState(true)
  const [installed, setInstalled] = useState(false)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '' })

  useEffect(() => {
    fetch('/api/setup').then(r => r.json()).then(d => {
      setInstalled(!!d.admin_exists)
      setChecking(false)
    }).catch(() => setChecking(false))
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || 'فشل')
      setDone(true)
    } catch (err: any) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-50 to-gold-50/40">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo size={56} /></div>
        <div className="card card-body">
          {checking && <div className="text-center text-brand-500 py-6"><Loader2 className="animate-spin inline" /></div>}

          {!checking && installed && !done && (
            <div className="text-center py-4">
              <ShieldAlert className="mx-auto mb-3 text-amber-600" size={40} />
              <h2 className="font-display text-xl font-bold text-brand-950 mb-2">تم التثبيت سابقاً</h2>
              <p className="text-brand-600 text-sm mb-4">حساب الإدارة موجود. ادخل من صفحة تسجيل الدخول.</p>
              <Link href="/login" className="btn-primary">تسجيل الدخول</Link>
            </div>
          )}

          {!checking && !installed && !done && (
            <>
              <h1 className="font-display text-2xl font-extrabold text-brand-950 mb-1 text-center">تثبيت الصندوق</h1>
              <p className="text-center text-brand-600 text-sm mb-6">أنشئ حساب المدير الأول</p>
              <form onSubmit={onSubmit} className="space-y-3">
                <input className="input" placeholder="الاسم الكامل" required
                  value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                <input className="input" placeholder="رقم الجوال (05XXXXXXXX)" required
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <input className="input" placeholder="البريد الإلكتروني (اختياري)" type="email"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <input className="input" placeholder="كلمة المرور (٦ أحرف على الأقل)" type="password" required minLength={6}
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                {error && <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2">{error}</div>}
                <button disabled={busy} className="btn-primary w-full">
                  {busy && <Loader2 className="animate-spin" size={16} />} إنشاء حساب المدير
                </button>
              </form>
            </>
          )}

          {done && (
            <div className="text-center py-4">
              <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={40} />
              <h2 className="font-display text-xl font-bold text-brand-950 mb-2">تم بنجاح</h2>
              <p className="text-brand-600 text-sm mb-4">يمكنك تسجيل الدخول الآن.</p>
              <Link href="/login" className="btn-primary">تسجيل الدخول</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
