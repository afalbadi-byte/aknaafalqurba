'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, Loader2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import Logo from '@/components/logo'

// Next.js 15 requires useSearchParams to live inside a Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>}>
      <Login />
    </Suspense>
  )
}

function Login() {
  const router = useRouter()
  const params = useSearchParams()
  const next   = params.get('next') || '/dashboard'

  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [busy,       setBusy]       = useState(false)
  const [error,      setError]      = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await api.auth.login(identifier, password)
      router.push(next)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen with-watermark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-6"><Logo size={56} /></Link>
        <div className="card">
          <div className="card-body">
            <h1 className="font-display text-2xl font-extrabold text-brand-950 mb-1 text-center">تسجيل الدخول</h1>
            <p className="text-center text-brand-600 text-sm mb-6">أهلاً بك في صندوق العائلة</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label">رقم الجوال أو البريد</label>
                <input className="input" type="text" required autoFocus
                  value={identifier} onChange={e => setIdentifier(e.target.value)}
                  placeholder="05XXXXXXXX" />
              </div>
              <div>
                <label className="label">كلمة المرور</label>
                <input className="input" type="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
              )}

              <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
                {busy ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
                دخول
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-brand-600">
              ليس لديك حساب؟ <Link href="/register" className="text-brand-700 font-bold hover:underline">سجّل الآن</Link>
            </div>
          </div>
        </div>
        <div className="text-center mt-4">
          <Link href="/" className="text-brand-500 text-sm hover:text-brand-700">← العودة للرئيسية</Link>
        </div>
      </div>
    </div>
  )
}
