'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UserPlus, Loader2, CheckCircle2, CalendarDays, MailCheck, ShieldCheck,
  Upload, ArrowRight, Sparkles, Lock, Eye, FileImage,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import Logo from '@/components/logo'
import DarkToggle from '@/components/dark-toggle'
import { BRANCHES } from '@/lib/utils'

/* ─────────────────────────────────────────────────────
   Hijri ↔ Gregorian conversion
───────────────────────────────────────────────────── */
const HIJRI_MONTHS = [
  'محرم','صفر','ربيع الأول','ربيع الآخر',
  'جمادى الأولى','جمادى الآخرة','رجب','شعبان',
  'رمضان','شوال','ذو القعدة','ذو الحجة',
]
function hijriToJDN(hY: number, hM: number, hD: number) {
  return Math.floor((11*hY+3)/30)+354*hY+30*hM-Math.floor((hM-1)/2)+hD+1948440-385
}
function jdnToGregorian(jdn: number) {
  let l=jdn+68569; const n=Math.floor((4*l)/146097); l-=Math.floor((146097*n+3)/4)
  const i=Math.floor((4000*(l+1))/1461001); l-=Math.floor((1461*i)/4)-31
  const j=Math.floor((80*l)/2447); const gD=l-Math.floor((2447*j)/80)
  const gM=j+2-12*Math.floor(j/11); const gY=100*(n-49)+i+Math.floor(j/11)
  return `${gY}-${String(gM).padStart(2,'0')}-${String(gD).padStart(2,'0')}`
}
function hijriToGregorian(hY: number, hM: number, hD: number) { return jdnToGregorian(hijriToJDN(hY,hM,hD)) }
function gregorianToJDN(gy: number, gm: number, gd: number) {
  const t=Math.trunc((gm-14)/12)
  return Math.trunc((1461*(gy+4800+t))/4)+Math.trunc((367*(gm-2-12*t))/12)-Math.trunc((3*Math.trunc((gy+4900+t)/100))/4)+gd-32075
}
function jdnToHijri(jdn: number) {
  const l=jdn-1948440+10632; const n2=Math.floor((l-1)/10631); const l2=l-10631*n2+354
  const j2=Math.floor((10985-l2)/5316)*Math.floor((50*l2)/17719)+Math.floor(l2/5670)*Math.floor((43*l2)/15238)
  const l3=l2-Math.floor((30-j2)/15)*Math.floor((17719*j2)/50)-Math.floor(j2/16)*Math.floor((15238*j2)/43)+29
  return { y:30*n2+j2-30, m:Math.floor((24*l3)/709), d:l3-Math.floor((709*Math.floor((24*l3)/709))/24) }
}
function gregorianToHijri(iso: string) {
  if (!iso) return null; const [gy,gm,gd]=iso.split('-').map(Number); return jdnToHijri(gregorianToJDN(gy,gm,gd))
}

/* ─────────────────────────────────────────────────────
   BirthDatePicker
───────────────────────────────────────────────────── */
function BirthDatePicker({ value, onChange, readOnly }: { value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  const [cal, setCal] = useState<'gregorian'|'hijri'>('gregorian')
  const initH = value ? gregorianToHijri(value) : null
  const [hD, setHD] = useState(initH?.d ? String(initH.d) : '')
  const [hM, setHM] = useState(initH?.m ? String(initH.m) : '')
  const [hY, setHY] = useState(initH?.y ? String(initH.y) : '')

  function onHijriChange(d: string, m: string, y: string) {
    setHD(d); setHM(m); setHY(y)
    if (d && m && y) onChange(hijriToGregorian(Number(y), Number(m), Number(d)))
  }
  function switchToHijri() {
    if (value) { const h=gregorianToHijri(value); if(h){setHD(String(h.d));setHM(String(h.m));setHY(String(h.y))} }
    setCal('hijri')
  }

  const hijriYears = Array.from({length:80},(_,i)=>1446-i)
  const gregYears  = Array.from({length:80},(_,i)=>new Date().getFullYear()-10-i)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="label mb-0">تاريخ الميلاد</label>
        <div className="flex rounded-lg overflow-hidden border border-brand-200 dark:border-brand-700 text-xs">
          <button type="button" onClick={()=>setCal('gregorian')} className={`px-3 py-1.5 font-semibold transition ${cal==='gregorian'?'bg-brand-950 text-white dark:bg-gold-500 dark:text-brand-950':'bg-white dark:bg-brand-800 text-brand-600 dark:text-brand-300 hover:bg-brand-50'}`}>ميلادي</button>
          <button type="button" onClick={switchToHijri}           className={`px-3 py-1.5 font-semibold transition ${cal==='hijri'   ?'bg-brand-950 text-white dark:bg-gold-500 dark:text-brand-950':'bg-white dark:bg-brand-800 text-brand-600 dark:text-brand-300 hover:bg-brand-50'}`}>هجري</button>
        </div>
      </div>

      {cal === 'gregorian' ? (
        <input className="input" type="date" value={value} onChange={e=>onChange(e.target.value)} max={`${new Date().getFullYear()-10}-12-31`} readOnly={readOnly} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <select className="input text-sm" value={hD} onChange={e=>onHijriChange(e.target.value,hM,hY)} disabled={readOnly}>
            <option value="">اليوم</option>
            {Array.from({length:30},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input text-sm" value={hM} onChange={e=>onHijriChange(hD,e.target.value,hY)} disabled={readOnly}>
            <option value="">الشهر</option>
            {HIJRI_MONTHS.map((n,i)=><option key={i+1} value={i+1}>{n}</option>)}
          </select>
          <select className="input text-sm" value={hY} onChange={e=>onHijriChange(hD,hM,e.target.value)} disabled={readOnly}>
            <option value="">السنة</option>
            {hijriYears.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {value && (
        <div className="flex items-center gap-1.5 text-xs text-brand-500 dark:text-brand-400">
          <CalendarDays size={12} />
          {cal==='hijri'
            ? <span>يعادل: {new Date(value+'T00:00:00').toLocaleDateString('ar-SA-u-nu-latn',{year:'numeric',month:'long',day:'numeric'})}</span>
            : (()=>{const h=gregorianToHijri(value);return h?<span>هجري: {h.d} {HIJRI_MONTHS[h.m-1]} {h.y}</span>:null})()
          }
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Tawakkalna ID sample SVG
───────────────────────────────────────────────────── */
function TawakkalnaIdSample() {
  return (
    <svg viewBox="0 0 420 230" className="w-full rounded-2xl shadow-lg" role="img" aria-label="نموذج بطاقة الهوية من توكلنا">
      {/* Card background */}
      <rect width="420" height="230" rx="16" fill="#0f4c35" />
      {/* Green header */}
      <rect width="420" height="58" rx="16" fill="#006b3d" />
      <rect y="42" width="420" height="16" fill="#006b3d" />
      {/* Saudi emblem circle */}
      <circle cx="36" cy="29" r="18" fill="#005530" />
      <text x="36" y="35" textAnchor="middle" fill="#7be3aa" fontSize="20">🌴</text>
      {/* Header text */}
      <text x="224" y="21" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="Cairo, Tahoma, Arial">المملكة العربية السعودية</text>
      <text x="224" y="38" textAnchor="middle" fill="#a8f0cc" fontSize="10" fontFamily="Arial, sans-serif">توكلنا  —  Tawakkalna</text>
      {/* White card body */}
      <rect x="10" y="58" width="400" height="154" rx="8" fill="white" />
      {/* Photo area */}
      <rect x="20" y="68" width="76" height="100" rx="8" fill="#e5e7eb" />
      <text x="58" y="113" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="Arial">صورة</text>
      <text x="58" y="127" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="Arial">شخصية</text>
      {/* QR placeholder */}
      <rect x="20" y="178" width="38" height="26" rx="4" fill="#f3f4f6" />
      <text x="39" y="195" textAnchor="middle" fill="#d1d5db" fontSize="7" fontFamily="Arial">QR</text>

      {/* ── Highlighted fields ── */}
      {/* Name */}
      <rect x="104" y="68" width="298" height="34" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="395" y="80" textAnchor="end" fill="#6b7280" fontSize="8.5" fontFamily="Tahoma, Arial">الاسم الكامل / Full Name</text>
      <text x="395" y="95" textAnchor="end" fill="#1d4ed8" fontSize="12" fontWeight="bold" fontFamily="Cairo, Tahoma, Arial">█████ ████ البادي</text>
      {/* Auto badge - name */}
      <rect x="104" y="72" width="68" height="14" rx="7" fill="#2563eb" />
      <text x="138" y="83" textAnchor="middle" fill="white" fontSize="8" fontFamily="Arial">✦ يُستخرج</text>

      {/* National ID */}
      <rect x="104" y="108" width="298" height="30" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="395" y="119" textAnchor="end" fill="#6b7280" fontSize="8.5" fontFamily="Tahoma, Arial">رقم الهوية الوطنية / National ID</text>
      <text x="395" y="133" textAnchor="end" fill="#1d4ed8" fontSize="12" fontWeight="bold" fontFamily="Arial, monospace">1  X  X  X  X  X  X  X  X  X</text>
      <rect x="104" y="111" width="68" height="14" rx="7" fill="#2563eb" />
      <text x="138" y="122" textAnchor="middle" fill="white" fontSize="8" fontFamily="Arial">✦ يُستخرج</text>

      {/* Birth date */}
      <rect x="104" y="144" width="180" height="30" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="277" y="155" textAnchor="end" fill="#6b7280" fontSize="8.5" fontFamily="Tahoma, Arial">تاريخ الميلاد</text>
      <text x="277" y="169" textAnchor="end" fill="#1d4ed8" fontSize="11" fontWeight="bold" fontFamily="Cairo, Tahoma, Arial">١٤٠٥/٠٨/١٥ هـ</text>
      <rect x="104" y="147" width="68" height="14" rx="7" fill="#2563eb" />
      <text x="138" y="158" textAnchor="middle" fill="white" fontSize="8" fontFamily="Arial">✦ يُستخرج</text>

      {/* Gender */}
      <rect x="291" y="144" width="111" height="30" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="395" y="155" textAnchor="end" fill="#6b7280" fontSize="8.5" fontFamily="Tahoma, Arial">الجنس</text>
      <text x="395" y="169" textAnchor="end" fill="#1d4ed8" fontSize="11" fontWeight="bold" fontFamily="Cairo, Tahoma, Arial">ذكر / Male</text>
      <rect x="291" y="147" width="68" height="14" rx="7" fill="#2563eb" />
      <text x="325" y="158" textAnchor="middle" fill="white" fontSize="8" fontFamily="Arial">✦ يُستخرج</text>

      {/* Bottom strip */}
      <rect x="10" y="196" width="400" height="16" rx="8" fill="#dcfce7" />
      <text x="210" y="208" textAnchor="middle" fill="#15803d" fontSize="8" fontFamily="Arial, sans-serif">الهوية الرقمية الموثقة — Digital Verified Identity</text>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────
   AutoBadge
───────────────────────────────────────────────────── */
function AutoBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-0.5 rounded-full">
      <Sparkles size={9} /> استُخرج تلقائياً
    </span>
  )
}

/* ─────────────────────────────────────────────────────
   F — generic field wrapper
───────────────────────────────────────────────────── */
function F({ label, v, on, type='text', required, placeholder, readOnly, auto }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label mb-0">{label}</label>
        {auto && <AutoBadge />}
      </div>
      <input
        className={`input ${auto ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}`}
        type={type} value={v}
        onChange={e => on(e.target.value)}
        required={required}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Register page
───────────────────────────────────────────────────── */
export default function Register() {
  useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Step state ──
  const [step, setStep] = useState<'upload'|'form'>('upload')

  // ── ID extraction ──
  const [idDoc,       setIdDoc]       = useState('')       // base64 — sent with registration
  const [idFileName,  setIdFileName]  = useState('')
  const [extracting,  setExtracting]  = useState(false)
  const [extractError,setExtractError]= useState('')
  const [autoFilled,  setAutoFilled]  = useState<Set<string>>(new Set())

  // ── Form fields ──
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', national_id: '', branch: '', city: '',
    birth_date: '', gender: '', generation_number: '', password: '', confirm: '',
  })
  const [busy,      setBusy]     = useState(false)
  const [error,     setError]    = useState('')
  const [memberId,  setMemberId] = useState<number|null>(null)
  const [emailPending,    setEmailPending]    = useState(false)
  const [aiVerifiedAtReg, setAiVerifiedAtReg] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  /* ── Handle ID file selection ── */
  async function handleIdFile(file: File | null) {
    if (!file) return
    if (file.size > 6 * 1024 * 1024) { setExtractError('حجم الملف يجب أن يكون أقل من ٦ ميجابايت'); return }
    setExtractError('')
    setIdFileName(`${file.name}  (${(file.size/1024).toFixed(0)} KB)`)
    setExtracting(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const doc = reader.result as string
      setIdDoc(doc)
      try {
        const r = await api.auth.extractId(doc)
        const ext = r.extracted
        const filled = new Set<string>()
        if (ext.full_name)   { set('full_name',   ext.full_name);   filled.add('full_name') }
        if (ext.national_id) { set('national_id', ext.national_id); filled.add('national_id') }
        if (ext.birth_date)  { set('birth_date',  ext.birth_date);  filled.add('birth_date') }
        if (ext.gender)      { set('gender',       ext.gender);     filled.add('gender') }
        setAutoFilled(filled)
        setStep('form')
      } catch (e: any) {
        setExtractError(e.message || 'فشل استخراج البيانات — حاول مرة أخرى أو أملأ البيانات يدوياً')
      } finally { setExtracting(false) }
    }
    reader.readAsDataURL(file)
  }

  /* ── Drag-and-drop ── */
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0] ?? null
    if (file) handleIdFile(file)
  }

  /* ── Form submit ── */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (form.password !== form.confirm) return setError('كلمتا المرور غير متطابقتين')
    if (form.password.length < 6)       return setError('كلمة المرور يجب ٦ أحرف على الأقل')
    setBusy(true)
    try {
      const { confirm, ...payload } = form
      const r = await api.auth.register({
        ...payload,
        national_id:       payload.national_id       || undefined,
        birth_date:        payload.birth_date         || undefined,
        generation_number: payload.generation_number  ? Number(payload.generation_number) : undefined,
        id_document:       idDoc                      || undefined,
      })
      setMemberId(r.member_id)
      setEmailPending(!!r.email_pending)
      setAiVerifiedAtReg(!!r.ai_verified)
    } catch (err: any) { setError(err.message) }
    finally { setBusy(false) }
  }

  /* ══════════════════════════════════════════
     SUCCESS SCREEN
  ══════════════════════════════════════════ */
  if (memberId) {
    /* AI verified at registration → full activation */
    if (aiVerifiedAtReg) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="card card-body max-w-md text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={44} />
            </div>
            <h2 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-2">مرحباً بك في الصندوق! 🎉</h2>
            <p className="text-brand-600 dark:text-brand-400 text-sm mb-2">
              تم التحقق من هويتك وتفعيل عضويتك تلقائياً.
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-2 mb-6">
              ✦ بياناتك استُخرجت من هويتك وجُحققت بنجاح
            </p>
            <Link href="/login" className="btn-primary w-full">تسجيل الدخول الآن</Link>
          </div>
        </div>
      )
    }

    /* Normal flow — two verification steps */
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
            <Link href={emailPending ? `/verify-email?m=${memberId}` : '#'}
              className={`flex items-center gap-4 rounded-xl border-2 p-4 transition ${emailPending?'border-brand-200 dark:border-brand-700 hover:border-gold-400 hover:bg-brand-50 dark:hover:bg-brand-800':'border-brand-100 dark:border-brand-800 opacity-50'}`}>
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

            {!idDoc && (
              <Link href={`/verify-identity?m=${memberId}`}
                className="flex items-center gap-4 rounded-xl border-2 border-brand-200 dark:border-brand-700 p-4 hover:border-gold-400 hover:bg-brand-50 dark:hover:bg-brand-800 transition">
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-800 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} className="text-brand-700 dark:text-brand-300" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-brand-950 dark:text-brand-50 text-sm">② التحقق من الهوية</div>
                  <div className="text-xs text-brand-500 dark:text-brand-400">ارفع هويتك من توكلنا للتفعيل الفوري</div>
                </div>
                <span className="text-xs text-brand-400">←</span>
              </Link>
            )}
          </div>
          <p className="text-center text-xs text-brand-400 dark:text-brand-500 mt-4">
            يُفعَّل حسابك تلقائياً بعد اكتمال التحقق
          </p>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════
     STEP 1 — UPLOAD TAWAKKALNA ID
  ══════════════════════════════════════════ */
  if (step === 'upload') {
    return (
      <div className="min-h-screen with-watermark flex items-center justify-center p-4 py-10 relative">
        <div className="absolute top-4 left-4"><DarkToggle /></div>
        <div className="w-full max-w-lg">
          <Link href="/" className="flex justify-center mb-6"><Logo size={56} /></Link>

          <div className="card">
            <div className="card-body space-y-5">
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full mb-3">
                  <Sparkles size={12} /> خطوة ١ من ٢
                </div>
                <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-1">
                  ارفع هويتك من توكلنا
                </h1>
                <p className="text-brand-600 dark:text-brand-400 text-sm">
                  الذكاء الاصطناعي سيملأ بياناتك تلقائياً
                </p>
              </div>

              {/* Sample ID card */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-brand-600 dark:text-brand-400 text-center">الحقول التي تُستخرج تلقائياً ✦</p>
                <TawakkalnaIdSample />
              </div>

              {/* How-to guide */}
              <div className="bg-brand-50 dark:bg-brand-800/50 rounded-xl p-4">
                <p className="font-bold text-brand-900 dark:text-brand-100 text-sm mb-3">كيف تحصل على الهوية من توكلنا؟</p>
                <ol className="space-y-2 text-sm text-brand-700 dark:text-brand-300">
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
                    اضغط على أيقونة <strong>المشاركة / التصدير</strong> ← احفظ كـ <strong>PDF أو صورة</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-brand-200 dark:bg-brand-700 text-brand-800 dark:text-brand-200 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">٤</span>
                    ارفع الملف هنا 👇
                  </li>
                </ol>
              </div>

              {/* Privacy notice */}
              <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
                <Lock size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  <span className="font-bold">خصوصيتك محمية تماماً:</span> صورة هويتك تُرسَل مباشرة لخوارزمية القراءة
                  ولا تُحفظ على خوادمنا. نحتفظ فقط بالبيانات المُستخرجة (الاسم، الرقم، التاريخ).
                  <Link href="/privacy" className="underline mr-1" target="_blank">سياسة الخصوصية</Link>
                </div>
              </div>

              {/* Drop zone */}
              <div>
                <label
                  onDragOver={e => e.preventDefault()}
                  onDrop={onDrop}
                  className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition
                    ${extracting ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-brand-200 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-800 hover:border-gold-400'}`}
                >
                  {extracting ? (
                    <>
                      <Loader2 size={32} className="text-blue-500 animate-spin" />
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold">جاري قراءة هويتك…</span>
                    </>
                  ) : (
                    <>
                      <FileImage size={36} className="text-brand-400" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                          {idFileName || 'اسحب الملف هنا أو اضغط للاختيار'}
                        </p>
                        <p className="text-xs text-brand-400 dark:text-brand-500 mt-1">PDF أو صورة — حتى ٦ ميجابايت</p>
                      </div>
                    </>
                  )}
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,image/*"
                    onChange={e => handleIdFile(e.target.files?.[0] ?? null)} />
                </label>

                {extractError && (
                  <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                    {extractError}
                  </div>
                )}
              </div>

              {/* Skip */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setAutoFilled(new Set()); setStep('form') }}
                  className="text-sm text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-200 underline"
                >
                  أو أملأ البيانات يدوياً ←
                </button>
              </div>

              <div className="text-center text-sm text-brand-600 dark:text-brand-400 pt-1">
                لديك حساب بالفعل؟{' '}
                <Link href="/login" className="text-brand-700 font-bold hover:underline">سجّل دخولك</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════
     STEP 2 — REGISTRATION FORM
  ══════════════════════════════════════════ */
  return (
    <div className="min-h-screen with-watermark flex items-center justify-center p-4 py-10 relative">
      <div className="absolute top-4 left-4"><DarkToggle /></div>
      <div className="w-full max-w-2xl">
        <Link href="/" className="flex justify-center mb-6"><Logo size={56} /></Link>
        <div className="card">
          <div className="card-body">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
                    خطوة ٢ من ٢
                  </div>
                  {autoFilled.size > 0 && (
                    <div className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full">
                      <Sparkles size={10} /> {autoFilled.size} حقول جُلبت تلقائياً
                    </div>
                  )}
                </div>
                <h1 className="font-display text-xl font-extrabold text-brand-950 dark:text-brand-50">أكمل بيانات التسجيل</h1>
              </div>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-200"
              >
                <ArrowRight size={14} /> تغيير الهوية
              </button>
            </div>

            {autoFilled.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-2.5 mb-4 text-xs text-blue-700 dark:text-blue-300">
                <Eye size={14} className="shrink-0" />
                الحقول بالإطار الأزرق استُخرجت من هويتك — راجعها وعدّلها إذا لزم
              </div>
            )}

            <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4 mt-2">
              <F label="الاسم الكامل *"      v={form.full_name}   on={v=>set('full_name',v)}   required auto={autoFilled.has('full_name')} />
              <F label="رقم الجوال *"        v={form.phone}       on={v=>set('phone',v)}       required placeholder="05XXXXXXXX" />
              <F label="البريد الإلكتروني"   v={form.email}       on={v=>set('email',v)}       type="email" placeholder="example@email.com" />
              <F label="رقم الهوية الوطنية"  v={form.national_id} on={v=>set('national_id',v)} placeholder="10XXXXXXXXX" auto={autoFilled.has('national_id')} />

              {/* Branch */}
              <div>
                <label className="label">الفرع</label>
                <select className="input" value={form.branch} onChange={e=>set('branch',e.target.value)}>
                  <option value="">— اختر الفرع —</option>
                  {BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Gender */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">الجنس</label>
                  {autoFilled.has('gender') && <AutoBadge />}
                </div>
                <select
                  className={`input ${autoFilled.has('gender') ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}`}
                  value={form.gender} onChange={e=>set('gender',e.target.value)}
                >
                  <option value="">— اختر —</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>

              {/* Generation */}
              <div>
                <label className="label">رقم الجيل <span className="text-brand-400 font-normal text-xs">(الجد البادي = الجيل الأول)</span></label>
                <select className="input" value={form.generation_number} onChange={e=>set('generation_number',e.target.value)}>
                  <option value="">— اختر الجيل —</option>
                  {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>الجيل {n}</option>)}
                </select>
              </div>

              {/* Birth date — full width */}
              <div className="sm:col-span-2">
                <BirthDatePicker
                  value={form.birth_date}
                  onChange={v=>set('birth_date',v)}
                  readOnly={autoFilled.has('birth_date')}
                />
                {autoFilled.has('birth_date') && (
                  <div className="flex items-center justify-between mt-1">
                    <AutoBadge />
                    <button type="button" onClick={()=>{ setAutoFilled(prev=>{const n=new Set(prev);n.delete('birth_date');return n}) }} className="text-xs text-brand-400 hover:underline">تعديل</button>
                  </div>
                )}
              </div>

              <F label="المدينة" v={form.city} on={v=>set('city',v)} />
              <div>{/* spacer on small screens when city is alone */}</div>

              <F label="كلمة المرور *"        v={form.password} on={v=>set('password',v)} type="password" required />
              <F label="تأكيد كلمة المرور *"  v={form.confirm}  on={v=>set('confirm',v)}  type="password" required />

              {error && (
                <div className="sm:col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button type="submit" disabled={busy} className="sm:col-span-2 btn-primary !py-3">
                {busy ? <><Loader2 className="animate-spin" size={18} /> جاري الإرسال…</> : <><UserPlus size={18} /> إرسال طلب الانضمام</>}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-brand-400 dark:text-brand-500">
              <Link href="/login" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">لديك حساب؟ سجّل دخولك</Link>
              <span>·</span>
              <Link href="/privacy" className="hover:underline" target="_blank">سياسة الخصوصية</Link>
              <span>·</span>
              <Link href="/privacy#terms" className="hover:underline" target="_blank">الشروط والأحكام</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
