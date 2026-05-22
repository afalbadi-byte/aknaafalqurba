'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Upload, Loader2, CheckCircle2, XCircle, ShieldCheck, Lock, FileImage } from 'lucide-react'
import { api } from '@/lib/api-client'
import Logo from '@/components/logo'

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>}>
      <VerifyIdentity />
    </Suspense>
  )
}

/* ─────────────────────────────────────────────
   Tawakkalna ID sample (same design as register page)
───────────────────────────────────────────────── */
function TawakkalnaIdSample() {
  return (
    <svg viewBox="0 0 420 230" className="w-full rounded-xl shadow" role="img" aria-label="نموذج بطاقة الهوية من توكلنا">
      <rect width="420" height="230" rx="16" fill="#0f4c35" />
      <rect width="420" height="58" rx="16" fill="#006b3d" />
      <rect y="42" width="420" height="16" fill="#006b3d" />
      <circle cx="36" cy="29" r="18" fill="#005530" />
      <text x="36" y="35" textAnchor="middle" fill="#7be3aa" fontSize="20">🌴</text>
      <text x="224" y="21" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="Cairo, Tahoma, Arial">المملكة العربية السعودية</text>
      <text x="224" y="38" textAnchor="middle" fill="#a8f0cc" fontSize="10" fontFamily="Arial, sans-serif">توكلنا  —  Tawakkalna</text>
      <rect x="10" y="58" width="400" height="154" rx="8" fill="white" />
      <rect x="20" y="68" width="76" height="100" rx="8" fill="#e5e7eb" />
      <text x="58" y="113" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="Arial">صورة</text>
      <text x="58" y="127" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="Arial">شخصية</text>
      <rect x="20" y="178" width="38" height="26" rx="4" fill="#f3f4f6" />
      <text x="39" y="195" textAnchor="middle" fill="#d1d5db" fontSize="7" fontFamily="Arial">QR</text>

      <rect x="104" y="68" width="298" height="34" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="395" y="80" textAnchor="end" fill="#6b7280" fontSize="8.5" fontFamily="Tahoma, Arial">الاسم الكامل / Full Name</text>
      <text x="395" y="95" textAnchor="end" fill="#1d4ed8" fontSize="12" fontWeight="bold" fontFamily="Cairo, Tahoma, Arial">اسمك الرباعي هنا</text>
      <rect x="104" y="108" width="298" height="30" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="395" y="119" textAnchor="end" fill="#6b7280" fontSize="8.5" fontFamily="Tahoma, Arial">رقم الهوية الوطنية / National ID</text>
      <text x="395" y="133" textAnchor="end" fill="#1d4ed8" fontSize="12" fontWeight="bold" fontFamily="Arial, monospace">1XXXXXXXXX</text>
      <rect x="104" y="144" width="180" height="30" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="277" y="155" textAnchor="end" fill="#6b7280" fontSize="8.5" fontFamily="Tahoma, Arial">تاريخ الميلاد</text>
      <text x="277" y="169" textAnchor="end" fill="#1d4ed8" fontSize="11" fontWeight="bold" fontFamily="Cairo, Tahoma, Arial">١٤٠٥/٠٨/١٥ هـ</text>
      <rect x="291" y="144" width="111" height="30" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="395" y="155" textAnchor="end" fill="#6b7280" fontSize="8.5" fontFamily="Tahoma, Arial">الجنس</text>
      <text x="395" y="169" textAnchor="end" fill="#1d4ed8" fontSize="11" fontWeight="bold" fontFamily="Cairo, Tahoma, Arial">ذكر / Male</text>

      <rect x="10" y="196" width="400" height="16" rx="8" fill="#dcfce7" />
      <text x="210" y="208" textAnchor="middle" fill="#15803d" fontSize="8" fontFamily="Arial, sans-serif">الهوية الرقمية الموثقة — Digital Verified Identity</text>
    </svg>
  )
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────────── */
function VerifyIdentity() {
  const params   = useSearchParams()
  const memberId = Number(params.get('m') || 0)

  const [file,     setFile]     = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')
  const [result,   setResult]   = useState<'verified'|'activated'|'rejected'|null>(null)
  const [showGuide, setShowGuide] = useState(true)

  function onFileChange(f: File | null) {
    if (!f) { setFile(null); setFileName(''); return }
    if (f.size > 6 * 1024 * 1024) { setError('حجم الملف يجب أن يكون أقل من ٦ ميجابايت'); return }
    setFile(f); setFileName(`${f.name}  (${(f.size/1024).toFixed(0)} KB)`); setError('')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); onFileChange(e.dataTransfer.files?.[0] ?? null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !memberId) return
    setBusy(true); setError('')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const r = await api.auth.verifyIdentityDoc(memberId, reader.result as string)
        if (r.activated) setResult('activated')
        else if (r.verified) setResult('verified')
        else { setResult('rejected'); setError(r.message || 'لم يتم التحقق من الهوية') }
      } catch (err: any) { setError(err.message || 'حدث خطأ أثناء التحقق') }
      finally { setBusy(false) }
    }
    reader.readAsDataURL(file)
  }

  /* ── Invalid link ── */
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

  /* ── Activated ── */
  if (result === 'activated') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card card-body max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-2">تم تفعيل عضويتك! 🎉</h2>
          <p className="text-brand-600 dark:text-brand-400 text-sm mb-6">
            تم التحقق من هويتك وتأكيد بريدك الإلكتروني.<br />يمكنك الآن تسجيل الدخول.
          </p>
          <Link href="/login" className="btn-primary">تسجيل الدخول</Link>
        </div>
      </div>
    )
  }

  /* ── Verified (email still pending) ── */
  if (result === 'verified') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card card-body max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={36} />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-2">تم التحقق من هويتك ✅</h2>
          <p className="text-brand-600 dark:text-brand-400 text-sm mb-6">
            خطوة أخيرة — أكّد بريدك الإلكتروني لتفعيل الحساب.<br />تحقق من بريدك وأدخل رمز التأكيد.
          </p>
          <Link href={`/verify-email?m=${memberId}`} className="btn-primary">تأكيد البريد الإلكتروني</Link>
        </div>
      </div>
    )
  }

  /* ── Upload form ── */
  return (
    <div className="min-h-screen with-watermark flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        <Link href="/" className="flex justify-center mb-6"><Logo size={56} /></Link>
        <div className="card">
          <div className="card-body space-y-5">
            {/* Header */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={28} />
              </div>
              <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-1">تحقق من هويتك</h1>
              <p className="text-brand-600 dark:text-brand-400 text-sm">
                ارفع هويتك من تطبيق <strong>توكلنا</strong> لتفعيل عضويتك فوراً
              </p>
            </div>

            {/* Guide toggle */}
            <button
              type="button"
              onClick={() => setShowGuide(g => !g)}
              className="w-full flex items-center justify-between bg-brand-50 dark:bg-brand-800/50 hover:bg-brand-100 dark:hover:bg-brand-800 rounded-xl px-4 py-3 text-sm font-semibold text-brand-700 dark:text-brand-300 transition"
            >
              <span>كيف أحصل على الهوية من توكلنا؟</span>
              <span className="text-brand-400">{showGuide ? '▲' : '▼'}</span>
            </button>

            {showGuide && (
              <div className="space-y-3 -mt-1">
                <TawakkalnaIdSample />
                <ol className="space-y-2 text-sm text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-800/50 rounded-xl p-4">
                  <li className="flex items-start gap-2">
                    <span className="bg-brand-200 dark:bg-brand-700 text-brand-800 dark:text-brand-200 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">١</span>
                    افتح تطبيق <strong>توكلنا</strong> على جوالك
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-brand-200 dark:bg-brand-700 text-brand-800 dark:text-brand-200 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">٢</span>
                    اضغط على <strong>«هويتي»</strong> ← <strong>«الهوية الوطنية»</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-brand-200 dark:bg-brand-700 text-brand-800 dark:text-brand-200 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">٣</span>
                    اضغط على أيقونة <strong>المشاركة</strong> ← احفظ كـ <strong>PDF أو صورة</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-brand-200 dark:bg-brand-700 text-brand-800 dark:text-brand-200 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">٤</span>
                    ارفع الملف في الحقل أدناه
                  </li>
                </ol>
              </div>
            )}

            {/* Privacy notice */}
            <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3">
              <Lock size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                <strong>خصوصيتك محمية:</strong> صورة هويتك تُعالَج فوراً ولا تُحفظ على خوادمنا.
                نستخدمها للتحقق فقط.
                <Link href="/privacy" className="underline mr-1" target="_blank">سياسة الخصوصية</Link>
              </p>
            </div>

            {/* Upload form */}
            <form onSubmit={onSubmit} className="space-y-4">
              <label
                onDragOver={e => e.preventDefault()}
                onDrop={onDrop}
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-brand-200 dark:border-brand-700 rounded-xl p-8 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-800 hover:border-gold-400 transition"
              >
                <FileImage size={32} className="text-brand-400" />
                <span className="text-sm text-brand-600 dark:text-brand-400 text-center">
                  {fileName || 'اسحب الملف هنا أو اضغط للاختيار'}
                </span>
                <span className="text-xs text-brand-400 dark:text-brand-500">PDF أو صورة — حتى ٦ ميجابايت</span>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => onFileChange(e.target.files?.[0] ?? null)} />
              </label>

              {result === 'rejected' && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                  <XCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error || 'لم يتم التحقق — تأكد من وضوح الصورة وأن الهوية تعود لعائلة البادي'}</span>
                </div>
              )}
              {error && result !== 'rejected' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
              )}

              <button type="submit" disabled={!file || busy} className="btn-primary w-full !py-3">
                {busy ? <><Loader2 className="animate-spin" size={18} /> جاري التحقق…</> : <><ShieldCheck size={18} /> رفع وتحقق</>}
              </button>
            </form>

            {result === 'rejected' && (
              <button onClick={() => { setResult(null); setFile(null); setFileName(''); setError('') }}
                className="w-full text-center text-sm text-brand-600 dark:text-brand-400 hover:underline">
                حاول مرة أخرى برفع صورة أوضح
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
