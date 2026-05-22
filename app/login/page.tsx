'use client'
import { Suspense, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, Loader2, ShieldCheck, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api-client'
import Logo from '@/components/logo'
import DarkToggle from '@/components/dark-toggle'

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

  // ── Step 1 ──
  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')

  // ── Step 2 (OTP) ──
  const [step,       setStep]       = useState<'credentials' | 'otp'>('credentials')
  const [memberId,   setMemberId]   = useState<number | null>(null)
  const [emailHint,  setEmailHint]  = useState('')
  const [otp,        setOtp]        = useState('')
  const [cooldown,   setCooldown]   = useState(0)

  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')
  const otpRef = useRef<HTMLInputElement>(null)

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  // Auto-focus OTP input when step changes
  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus()
  }, [step])

  /* ── Step 1: credentials ── */
  async function onSubmitCredentials(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const r = await api.auth.login(identifier, password)
      if (r.otp_pending) {
        setMemberId(r.member_id)
        setEmailHint(r.email_hint)
        setStep('otp')
        setCooldown(60)
      } else {
        // Fallback: if server didn't require OTP (shouldn't happen)
        window.location.href = next
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  /* ── Step 2: verify OTP ── */
  async function onSubmitOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId) return
    setBusy(true); setError('')
    try {
      await api.auth.loginOtp(memberId, otp)
      window.location.href = next
    } catch (err: any) {
      setError(err.message)
      setOtp('')
    } finally {
      setBusy(false)
    }
  }

  /* ── Resend OTP ── */
  async function resendOtp() {
    if (!memberId || cooldown > 0) return
    setBusy(true); setError('')
    try {
      await api.auth.loginOtpResend(memberId)
      setCooldown(60)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen with-watermark flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4"><DarkToggle /></div>
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-6"><Logo size={56} /></Link>
        <div className="card">
          <div className="card-body">

            {step === 'credentials' ? (
              <>
                <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-1 text-center">تسجيل الدخول</h1>
                <p className="text-center text-brand-600 dark:text-brand-400 text-sm mb-6">أهلاً بك في صندوق العائلة</p>

                <form onSubmit={onSubmitCredentials} className="space-y-4">
                  <div>
                    <label className="label">رقم الهوية الوطنية</label>
                    <input className="input" type="text" required autoFocus
                      value={identifier} onChange={e => setIdentifier(e.target.value)}
                      placeholder="10XXXXXXXXX" />
                  </div>
                  <div>
                    <label className="label">كلمة المرور</label>
                    <input className="input" type="password" required
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" />
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
                  )}

                  <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
                    {busy ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
                    دخول
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* OTP Step */}
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck size={28} />
                  </div>
                  <h1 className="font-display text-xl font-extrabold text-brand-950 dark:text-brand-50 mb-1">رمز التحقق</h1>
                  <p className="text-sm text-brand-600 dark:text-brand-400">
                    أرسلنا رمزاً مكوناً من ٦ أرقام إلى<br />
                    <span className="font-semibold text-brand-800 dark:text-brand-200">{emailHint}</span>
                  </p>
                </div>

                <form onSubmit={onSubmitOtp} className="space-y-4">
                  <input
                    ref={otpRef}
                    className="input text-center text-2xl font-mono tracking-[0.4em] !py-4"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="_ _ _ _ _ _"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoComplete="one-time-code"
                  />

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
                  )}

                  <button type="submit" disabled={busy || otp.length < 6} className="btn-primary w-full !py-3">
                    {busy ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                    تأكيد الدخول
                  </button>
                </form>

                <div className="mt-4 text-center space-y-2">
                  <button
                    onClick={resendOtp}
                    disabled={cooldown > 0 || busy}
                    className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-200 disabled:opacity-40 mx-auto transition"
                  >
                    <RotateCcw size={14} />
                    {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown}ث` : 'إعادة إرسال الرمز'}
                  </button>
                  <button
                    onClick={() => { setStep('credentials'); setOtp(''); setError('') }}
                    className="text-xs text-brand-400 dark:text-brand-500 hover:underline"
                  >
                    ← تغيير بيانات الدخول
                  </button>
                </div>
              </>
            )}

            <div className="mt-6 text-center text-sm text-brand-600 dark:text-brand-400">
              ليس لديك حساب؟ <Link href="/register" className="text-brand-700 dark:text-brand-300 font-bold hover:underline">سجّل الآن</Link>
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
