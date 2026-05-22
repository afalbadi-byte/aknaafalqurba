'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Upload, Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api-client'
import Logo from '@/components/logo'

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>}>
      <VerifyIdentity />
    </Suspense>
  )
}

function VerifyIdentity() {
  const params   = useSearchParams()
  const memberId = Number(params.get('m') || 0)

  const [file,     setFile]     = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')
  const [result,   setResult]   = useState<'verified' | 'activated' | 'rejected' | null>(null)

  function onFileChange(f: File | null) {
    if (!f) { setFile(null); setFileName(''); return }
    if (f.size > 6 * 1024 * 1024) { setError('حجم الملف يجب أن يكون أقل من ٦ ميجابايت'); return }
    setFile(f)
    setFileName(`${f.name}  (${(f.size / 1024).toFixed(0)} KB)`)
    setError('')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !memberId) return
    setBusy(true); setError('')

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const r = await api.auth.verifyIdentityDoc(memberId, reader.result as string)
        if (r.activated) {
          setResult('activated')
        } else if (r.verified) {
          setResult('verified')
        } else {
          setResult('rejected')
          setError(r.message || 'لم يتم التحقق من الهوية')
        }
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء التحقق')
      } finally {
        setBusy(false)
      }
    }
    reader.readAsDataURL(file)
  }

  if (!memberId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card card-body max-w-md text-center">
          <p className="text-brand-600 dark:text-brand-400">
            رابط غير صالح. ابدأ من{' '}
            <Link href="/register" className="text-brand-700 font-bold underline">صفحة التسجيل</Link>.
          </p>
        </div>
      </div>
    )
  }

  /* ── Result screens ── */
  if (result === 'activated') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card card-body max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-2">تم تفعيل عضويتك! 🎉</h2>
          <p className="text-brand-600 dark:text-brand-400 text-sm mb-6">
            تم التحقق من هويتك وتأكيد بريدك الإلكتروني.<br />
            يمكنك الآن تسجيل الدخول.
          </p>
          <Link href="/login" className="btn-primary">تسجيل الدخول</Link>
        </div>
      </div>
    )
  }

  if (result === 'verified') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card card-body max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={36} />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-2">تم التحقق من هويتك ✅</h2>
          <p className="text-brand-600 dark:text-brand-400 text-sm mb-6">
            خطوة أخيرة — أكّد بريدك الإلكتروني لتفعيل الحساب.<br />
            تحقق من بريدك وأدخل رمز التأكيد.
          </p>
          <Link href={`/verify-email?m=${memberId}`} className="btn-primary">تأكيد البريد الإلكتروني</Link>
        </div>
      </div>
    )
  }

  /* ── Upload form ── */
  return (
    <div className="min-h-screen with-watermark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-6"><Logo size={56} /></Link>
        <div className="card">
          <div className="card-body">
            <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-1 text-center">تحقق من هويتك</h1>
            <p className="text-center text-brand-600 dark:text-brand-400 text-sm mb-6">
              ارفع صورة هويتك من تطبيق <span className="font-bold">توكلنا</span><br />
              <span className="text-xs text-brand-400">(PDF أو صورة — حتى ٦ ميجابايت)</span>
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-brand-200 dark:border-brand-700 rounded-xl p-8 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-800 transition">
                <Upload size={32} className="text-brand-400" />
                <span className="text-sm text-brand-600 dark:text-brand-400 text-center">
                  {fileName || 'اضغط لاختيار الملف'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={e => onFileChange(e.target.files?.[0] ?? null)}
                />
              </label>

              {result === 'rejected' && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                  <XCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error || 'لم يتم التحقق — تأكد من وضوح الصورة وأن الهوية تعود لعائلة البادي'}</span>
                </div>
              )}

              {error && result !== 'rejected' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
              )}

              <button type="submit" disabled={!file || busy} className="btn-primary w-full !py-3">
                {busy
                  ? <><Loader2 className="animate-spin" size={18} /> جاري التحقق...</>
                  : <><ShieldCheck size={18} /> رفع وتحقق</>}
              </button>
            </form>

            {result === 'rejected' && (
              <button
                onClick={() => { setResult(null); setFile(null); setFileName(''); setError('') }}
                className="mt-3 w-full text-center text-sm text-brand-600 dark:text-brand-400 hover:underline"
              >
                حاول مرة أخرى برفع صورة أوضح
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
