'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserPlus, Loader2, CheckCircle2, CalendarDays, MailCheck, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api-client'
import Logo from '@/components/logo'
import DarkToggle from '@/components/dark-toggle'
import { BRANCHES } from '@/lib/utils'

/* ─────────────────────────────────────────────────────
   Hijri ↔ Gregorian conversion (Tabular Islamic Calendar)
───────────────────────────────────────────────────── */
const HIJRI_MONTHS = [
  'محرم','صفر','ربيع الأول','ربيع الآخر',
  'جمادى الأولى','جمادى الآخرة','رجب','شعبان',
  'رمضان','شوال','ذو القعدة','ذو الحجة',
]

/* ─── Hijri → JDN  (Meeus "Astronomical Algorithms" tabular formula) ─── */
function hijriToJDN(hY: number, hM: number, hD: number): number {
  return (
    Math.floor((11 * hY + 3) / 30) +
    354 * hY +
    30 * hM -
    Math.floor((hM - 1) / 2) +
    hD +
    1948440 - 385
  )
}

/* ─── JDN → Gregorian ─── */
function jdnToGregorian(jdn: number): string {
  let l = jdn + 68569
  const n = Math.floor((4 * l) / 146097)
  l -= Math.floor((146097 * n + 3) / 4)
  const i = Math.floor((4000 * (l + 1)) / 1461001)
  l -= Math.floor((1461 * i) / 4) - 31
  const j = Math.floor((80 * l) / 2447)
  const gD = l - Math.floor((2447 * j) / 80)
  const gM = j + 2 - 12 * Math.floor(j / 11)
  const gY = 100 * (n - 49) + i + Math.floor(j / 11)
  return `${gY}-${String(gM).padStart(2, '0')}-${String(gD).padStart(2, '0')}`
}

function hijriToGregorian(hY: number, hM: number, hD: number): string {
  return jdnToGregorian(hijriToJDN(hY, hM, hD))
}

/* ─── Gregorian → JDN  (uses Math.trunc — NOT Math.floor — for integer div) ─── */
function gregorianToJDN(gy: number, gm: number, gd: number): number {
  // (gm-14)/12 can be negative; the algorithm requires truncation-toward-zero
  const t = Math.trunc((gm - 14) / 12)
  return (
    Math.trunc((1461 * (gy + 4800 + t)) / 4) +
    Math.trunc((367 * (gm - 2 - 12 * t)) / 12) -
    Math.trunc((3 * Math.trunc((gy + 4900 + t) / 100)) / 4) +
    gd - 32075
  )
}

/* ─── JDN → Hijri ─── */
function jdnToHijri(jdn: number): { y: number; m: number; d: number } {
  const l  = jdn - 1948440 + 10632
  const n2 = Math.floor((l - 1) / 10631)
  const l2 = l - 10631 * n2 + 354
  const j2 =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670)           * Math.floor((43 * l2) / 15238)
  const l3 =
    l2 -
    Math.floor((30 - j2) / 15) * Math.floor((17719 * j2) / 50) -
    Math.floor(j2 / 16)        * Math.floor((15238 * j2) / 43) +
    29
  const hM = Math.floor((24 * l3) / 709)
  const hD = l3 - Math.floor((709 * hM) / 24)
  const hY = 30 * n2 + j2 - 30
  return { y: hY, m: hM, d: hD }
}

function gregorianToHijri(iso: string): { y: number; m: number; d: number } | null {
  if (!iso) return null
  const [gy, gm, gd] = iso.split('-').map(Number)
  return jdnToHijri(gregorianToJDN(gy, gm, gd))
}

/* ─────────────────────────────────────────────────────
   BirthDatePicker component
───────────────────────────────────────────────────── */
function BirthDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [cal, setCal] = useState<'gregorian' | 'hijri'>('gregorian')

  // Hijri selects state — initialised from current value if exists
  const initH = value ? gregorianToHijri(value) : null
  const [hD, setHD] = useState(initH?.d ? String(initH.d) : '')
  const [hM, setHM] = useState(initH?.m ? String(initH.m) : '')
  const [hY, setHY] = useState(initH?.y ? String(initH.y) : '')

  function onHijriChange(d: string, m: string, y: string) {
    setHD(d); setHM(m); setHY(y)
    if (d && m && y) {
      const iso = hijriToGregorian(Number(y), Number(m), Number(d))
      onChange(iso)
    }
  }

  function switchToHijri() {
    if (value) {
      const h = gregorianToHijri(value)
      if (h) { setHD(String(h.d)); setHM(String(h.m)); setHY(String(h.y)) }
    }
    setCal('hijri')
  }

  function switchToGregorian() {
    setCal('gregorian')
  }

  const currentHijriYear = 1446
  const hijriYears = Array.from({ length: 80 }, (_, i) => currentHijriYear - i)
  const gregYears  = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 10 - i)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="label mb-0">تاريخ الميلاد</label>
        {/* Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-brand-200 dark:border-brand-700 text-xs">
          <button
            type="button"
            onClick={switchToGregorian}
            className={`px-3 py-1.5 font-semibold transition ${
              cal === 'gregorian'
                ? 'bg-brand-950 text-white dark:bg-gold-500 dark:text-brand-950'
                : 'bg-white dark:bg-brand-800 text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-700'
            }`}
          >
            ميلادي
          </button>
          <button
            type="button"
            onClick={switchToHijri}
            className={`px-3 py-1.5 font-semibold transition ${
              cal === 'hijri'
                ? 'bg-brand-950 text-white dark:bg-gold-500 dark:text-brand-950'
                : 'bg-white dark:bg-brand-800 text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-700'
            }`}
          >
            هجري
          </button>
        </div>
      </div>

      {cal === 'gregorian' ? (
        /* ── Gregorian: native date input ── */
        <input
          className="input"
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          max={`${new Date().getFullYear() - 10}-12-31`}
        />
      ) : (
        /* ── Hijri: three selects ── */
        <div className="grid grid-cols-3 gap-2">
          {/* Day */}
          <select
            className="input text-sm"
            value={hD}
            onChange={e => onHijriChange(e.target.value, hM, hY)}
          >
            <option value="">اليوم</option>
            {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Month */}
          <select
            className="input text-sm"
            value={hM}
            onChange={e => onHijriChange(hD, e.target.value, hY)}
          >
            <option value="">الشهر</option>
            {HIJRI_MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>

          {/* Year */}
          <select
            className="input text-sm"
            value={hY}
            onChange={e => onHijriChange(hD, hM, e.target.value)}
          >
            <option value="">السنة</option>
            {hijriYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {/* Show converted result */}
      {value && (
        <div className="flex items-center gap-1.5 text-xs text-brand-500 dark:text-brand-400">
          <CalendarDays size={12} />
          {cal === 'hijri' ? (
            <span>يعادل: {new Date(value + 'T00:00:00').toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          ) : (
            (() => {
              const h = gregorianToHijri(value)
              return h ? <span>هجري: {h.d} {HIJRI_MONTHS[h.m - 1]} {h.y}</span> : null
            })()
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Register page
───────────────────────────────────────────────────── */
export default function Register() {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', national_id: '', branch: '', city: '',
    birth_date: '', gender: '', generation_number: '', password: '', confirm: '',
  })
  const [busy,      setBusy]     = useState(false)
  const [error,     setError]    = useState('')
  const [memberId,  setMemberId] = useState<number | null>(null)
  const [emailPending, setEmailPending] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (form.password !== form.confirm) return setError('كلمتا المرور غير متطابقتين')
    if (form.password.length < 6)        return setError('كلمة المرور يجب ٦ أحرف على الأقل')
    setBusy(true)
    try {
      const { confirm, ...payload } = form
      const r = await api.auth.register({
        ...payload,
        national_id:       payload.national_id || undefined,
        birth_date:        payload.birth_date || undefined,
        generation_number: payload.generation_number ? Number(payload.generation_number) : undefined,
      })
      setMemberId(r.member_id)
      setEmailPending(!!r.email_pending)
    } catch (err: any) { setError(err.message) }
    finally { setBusy(false) }
  }

  // ── Success screen ──
  if (memberId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card card-body max-w-md">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-1 text-center">تم إنشاء حسابك!</h2>
          <p className="text-center text-brand-600 dark:text-brand-400 text-sm mb-6">
            أكمل الخطوتين التاليتين لتفعيل عضويتك
          </p>

          <div className="space-y-3">
            {/* Step 1: Email */}
            <Link href={emailPending ? `/verify-email?m=${memberId}` : '#'}
              className={`flex items-center gap-4 rounded-xl border-2 p-4 transition ${emailPending ? 'border-brand-200 dark:border-brand-700 hover:border-gold-400 hover:bg-brand-50 dark:hover:bg-brand-800' : 'border-brand-100 dark:border-brand-800 opacity-50'}`}>
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-800 flex items-center justify-center shrink-0">
                <MailCheck size={20} className="text-brand-700 dark:text-brand-300" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-brand-950 dark:text-brand-50 text-sm">
                  {emailPending ? '① تأكيد البريد الإلكتروني' : '① لا يوجد بريد إلكتروني'}
                </div>
                <div className="text-xs text-brand-500 dark:text-brand-400">
                  {emailPending ? 'تحقق من بريدك وأدخل الرمز المُرسَل' : 'أضف بريدك من الملف الشخصي لاحقاً'}
                </div>
              </div>
              {emailPending && <span className="text-xs text-brand-400">←</span>}
            </Link>

            {/* Step 2: Identity */}
            <Link href={`/verify-identity?m=${memberId}`}
              className="flex items-center gap-4 rounded-xl border-2 border-brand-200 dark:border-brand-700 p-4 hover:border-gold-400 hover:bg-brand-50 dark:hover:bg-brand-800 transition">
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-800 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} className="text-brand-700 dark:text-brand-300" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-brand-950 dark:text-brand-50 text-sm">② رفع صورة الهوية</div>
                <div className="text-xs text-brand-500 dark:text-brand-400">ارفع هويتك من تطبيق توكلنا</div>
              </div>
              <span className="text-xs text-brand-400">←</span>
            </Link>
          </div>

          <p className="text-center text-xs text-brand-400 dark:text-brand-500 mt-4">
            يُفعَّل حسابك تلقائياً بعد اكتمال الخطوتين
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen with-watermark flex items-center justify-center p-4 py-10 relative">
      <div className="absolute top-4 left-4"><DarkToggle /></div>
      <div className="w-full max-w-2xl">
        <Link href="/" className="flex justify-center mb-6"><Logo size={56} /></Link>
        <div className="card">
          <div className="card-body">
            <h1 className="font-display text-2xl font-extrabold text-brand-950 mb-1 text-center">طلب انضمام للصندوق</h1>
            <p className="text-center text-brand-600 text-sm mb-6">املأ البيانات وسيتم مراجعة طلبك من قبل لجنة الصندوق</p>

            <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4">
              <F label="الاسم الكامل *"      v={form.full_name}  on={v => set('full_name', v)} required />
              <F label="رقم الجوال *"        v={form.phone}      on={v => set('phone', v)} required placeholder="05XXXXXXXX" />
              <F label="البريد الإلكتروني"   v={form.email}      on={v => set('email', v)} type="email" placeholder="example@email.com" />
              <F label="رقم الهوية الوطنية"  v={form.national_id} on={v => set('national_id', v)} placeholder="10XXXXXXXXX" />

              {/* Branch */}
              <div>
                <label className="label">الفرع</label>
                <select className="input" value={form.branch} onChange={e => set('branch', e.target.value)}>
                  <option value="">— اختر الفرع —</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="label">الجنس</label>
                <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">— اختر —</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>

              {/* Generation number */}
              <div>
                <label className="label">رقم الجيل <span className="text-brand-400 font-normal text-xs">(الجد بادي = الجيل الأول)</span></label>
                <select className="input" value={form.generation_number} onChange={e => set('generation_number', e.target.value)}>
                  <option value="">— اختر الجيل —</option>
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={n}>الجيل {n}</option>
                  ))}
                </select>
              </div>

              {/* Birth date — spans full width */}
              <div className="sm:col-span-2">
                <BirthDatePicker value={form.birth_date} onChange={v => set('birth_date', v)} />
              </div>

              <F label="المدينة"            v={form.city}       on={v => set('city', v)} />

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
