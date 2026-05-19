'use client'
import { useState } from 'react'
import Link from 'next/link'
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import Logo from '@/components/logo'

export default function Register() {
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', branch: '', city: '',
    birth_year: '', password: '', confirm: '',
  })
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')
  const [done,  setDone]  = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (form.password !== form.confirm) return setError('كلمتا المرور غير متطابقتين')
    if (form.password.length < 6)        return setError('كلمة المرور يجب ٦ أحرف على الأقل')
    setBusy(true)
    try {
      const { confirm, ...payload } = form
      await api.auth.register(payload)
      setDone(true)
    } catch (err: any) { setError(err.message) }
    finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card card-body max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-brand-950 mb-2">تم استلام طلبك</h2>
          <p className="text-brand-600 text-sm mb-6">
            تم تسجيل طلب انضمامك للصندوق. سيتم تفعيل حسابك بعد مراجعته من قبل لجنة الصندوق.
          </p>
          <Link href="/" className="btn-primary">العودة للرئيسية</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen with-watermark flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/" className="flex justify-center mb-6"><Logo size={56} /></Link>
        <div className="card">
          <div className="card-body">
            <h1 className="font-display text-2xl font-extrabold text-brand-950 mb-1 text-center">طلب انضمام للصندوق</h1>
            <p className="text-center text-brand-600 text-sm mb-6">املأ البيانات وسيتم مراجعة طلبك من قبل لجنة الصندوق</p>

            <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4">
              <F label="الاسم الكامل *"      v={form.full_name}  on={v => set('full_name', v)} required />
              <F label="رقم الجوال *"        v={form.phone}      on={v => set('phone', v)} required placeholder="05XXXXXXXX" />
              <F label="البريد الإلكتروني"  v={form.email}      on={v => set('email', v)} type="email" placeholder="example@email.com" />
              <F label="الفرع/البطن"        v={form.branch}     on={v => set('branch', v)} placeholder="مثال: بيت فلان" />
              <F label="المدينة"            v={form.city}       on={v => set('city', v)} />
              <F label="سنة الميلاد"         v={form.birth_year} on={v => set('birth_year', v)} type="number" placeholder="1990" />
              <F label="كلمة المرور *"       v={form.password}   on={v => set('password', v)} type="password" required />
              <F label="تأكيد كلمة المرور *" v={form.confirm}    on={v => set('confirm', v)} type="password" required />

              {error && (
                <div className="sm:col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
              )}

              <button type="submit" disabled={busy} className="sm:col-span-2 btn-primary !py-3">
                {busy ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                إرسال طلب الانضمام
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-brand-600">
              لديك حساب بالفعل؟ <Link href="/login" className="text-brand-700 font-bold hover:underline">سجّل دخولك</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function F({ label, v, on, type = 'text', required, placeholder }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={v} onChange={e => on(e.target.value)} required={required} placeholder={placeholder} />
    </div>
  )
}
