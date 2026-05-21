'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldCheck, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import Logo from '@/components/logo'

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>}>
      <VerifyEmail />
    </Suspense>
  )
}

function VerifyEmail() {
  const params = useSearchParams()
  const router = useRouter()
  const member_id = Number(params.get('m') || 0)

  const [code, setCode]   = useState(['', '', '', '', '', ''])
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  const [done, setDone]   = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = d
    setCode(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
  }

  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus()
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (digits.length === 6) {
      e.preventDefault()
      setCode(digits.split(''))
      refs.current[5]?.focus()
    }
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(''); setBusy(true)
    try {
      await api.auth.verifyEmail(member_id, code.join(''))
      setDone(true)
    } catch (err: any) {
      setError(err.message)
      setCode(['', '', '', '', '', ''])
      refs.current[0]?.focus()
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError('')
    try {
      await api.auth.resendVerification(member_id)
      setCooldown(60)
    } catch (err: any) {
      setError(err.message)
      if (err.status === 429) {
        // Parse cooldown from message if backend returns it
        const m = err.message.match(/(\d+)/)
        if (m) setCooldown(Number(m[1]))
      }
    }
  }

  if (!member_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card card-body max-w-md text-center">
          <p className="text-brand-600">رابط غير صالح. ابدأ من <Link href="/register" className="text-brand-700 font-bold underline">صفحة التسجيل</Link>.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card card-body max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950 mb-2">تم تأكيد بريدك</h1>
          <p className="text-brand-600 text-sm mb-6">
            بريدك الإلكتروني مؤكد ✅<br />
            طلب الانضمام لا يزال بانتظار مراجعة لجنة الصندوق.
          </p>
          <Link href="/" className="btn-primary">العودة للرئيسية</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen with-watermark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-6"><Logo size={56} /></Link>
        <div className="card">
          <div className="card-body">
            <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-brand-950 mb-1 text-center">تأكيد البريد الإلكتروني</h1>
            <p className="text-center text-brand-600 text-sm mb-6">
              أدخل الرمز المكوّن من ٦ أرقام الذي أرسلناه إلى بريدك
            </p>

            <form onSubmit={submit} className="space-y-5">
              <div className="flex justify-center gap-2 [direction:ltr]">
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { refs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => setDigit(i, e.target.value)}
                    onKeyDown={e => onKey(i, e)}
                    onPaste={onPaste}
                    className="w-12 h-14 text-center text-2xl font-bold font-mono border-2 border-brand-200 rounded-lg focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                  />
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 text-center">{error}</div>
              )}

              <button type="submit" disabled={busy || code.join('').length !== 6} className="btn-primary w-full !py-3">
                {busy ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                تأكيد
              </button>
            </form>

            <div className="mt-5 text-center text-sm">
              <button
                onClick={resend}
                disabled={cooldown > 0}
                className="text-brand-600 hover:text-brand-950 disabled:text-brand-300 disabled:cursor-not-allowed inline-flex items-center gap-1.5 font-semibold"
              >
                <RefreshCw size={14} />
                {cooldown > 0 ? `إعادة الإرسال خلال ${cooldown}ث` : 'لم يصلك الرمز؟ أعد الإرسال'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
