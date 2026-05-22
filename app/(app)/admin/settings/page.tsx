'use client'
import { useRef, useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { Save, Loader2, CreditCard, AlertCircle, Upload, X } from 'lucide-react'

const GROUPS = [
  {
    title: 'هوية الصندوق',
    fields: [
      { k: 'fund_name',    l: 'اسم الصندوق' },
      { k: 'family_name',  l: 'اسم العائلة' },
      { k: 'founded_year', l: 'سنة التأسيس' },
      { k: 'about',        l: 'نبذة عن الصندوق', textarea: true },
    ],
  },
  {
    title: 'الاشتراك',
    fields: [
      { k: 'subscription_amount', l: 'قيمة الاشتراك (ر.س)' },
      { k: 'subscription_period', l: 'دورية الاشتراك (monthly / yearly)' },
    ],
  },
  {
    title: 'بيانات التحويل البنكي',
    fields: [
      { k: 'bank_name',         l: 'اسم البنك' },
      { k: 'bank_account_name', l: 'اسم صاحب الحساب' },
      { k: 'bank_iban',         l: 'رقم الآيبان (IBAN)' },
    ],
  },
  {
    title: 'STC Pay والتواصل',
    fields: [
      { k: 'stc_pay_number',  l: 'رقم STC Pay' },
      { k: 'whatsapp_number', l: 'رقم واتساب الصندوق' },
      { k: 'phone',           l: 'رقم الجوال للتواصل' },
      { k: 'email',           l: 'البريد الإلكتروني' },
    ],
  },
  {
    title: 'الترخيص الرسمي',
    fields: [
      { k: 'license_number', l: 'رقم الترخيص' },
      { k: 'license_date',   l: 'تاريخ الترخيص' },
    ],
  },
]

const ABOUT_FIELDS = [
  { k: 'regulations', l: 'لائحة العائلة', textarea: true, rows: 6, placeholder: 'أدخل نص اللائحة الخاصة بالعائلة...' },
]

export default function Settings() {
  const [data, setData] = useState<any>({})
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<any>(null)
  const licFileRef = useRef<HTMLInputElement>(null)
  const [licBusy, setLicBusy] = useState(false)

  useEffect(() => {
    api.settings.all().then(r => setData(r.settings || {}))
  }, [])
  const set = (k: string, v: string) => setData((d: any) => ({ ...d, [k]: v }))

  // Compress raster images to save DB space
  function compressImage(file: File, maxPx = 1400): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(b => {
          if (!b) return reject(new Error('فشل ضغط الصورة'))
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(b)
        }, 'image/jpeg', 0.88)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('فشل تحميل الصورة')) }
      img.src = url
    })
  }

  // Read any file as base64 data URL (for PDF / Word / etc.)
  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('فشل قراءة الملف'))
      reader.readAsDataURL(file)
    })
  }

  async function handleLicenseUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) { alert('حجم الملف يجب أن يكون أقل من ١٥ ميجابايت'); return }
    setLicBusy(true)
    try {
      // Compress only raster images; everything else (PDF, TIFF, Word…) goes as-is
      const dataUrl = file.type.startsWith('image/') && !file.type.includes('tiff')
        ? await compressImage(file)
        : await readAsDataUrl(file)
      set('license_image', dataUrl)
    } catch (err: any) { alert(err.message) }
    finally { setLicBusy(false); if (licFileRef.current) licFileRef.current.value = '' }
  }

  async function save() {
    setBusy(true); setMsg(null)
    try {
      await api.settings.update(data)
      setMsg({ ok: true, text: 'تم حفظ الإعدادات' })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    finally { setBusy(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">إعدادات الصندوق</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">هذه القيم تظهر للأعضاء عند إجراء الدفعات</p>
      </div>

      <GatewayStatus />

      {GROUPS.map(g => (
        <div key={g.title} className="card">
          <div className="px-6 py-3 border-b border-brand-100 dark:border-brand-800"><h3 className="font-bold text-brand-950 dark:text-brand-50">{g.title}</h3></div>
          <div className="p-6 grid sm:grid-cols-2 gap-4">
            {g.fields.map(f => (
              <div key={f.k} className={f.textarea ? 'sm:col-span-2' : ''}>
                <label className="label">{f.l}</label>
                {f.textarea
                  ? <textarea className="input" rows={3} value={data[f.k] || ''} onChange={e => set(f.k, e.target.value)} />
                  : <input className="input" value={data[f.k] || ''} onChange={e => set(f.k, e.target.value)} />
                }
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* License image */}
      <div className="card">
        <div className="px-6 py-3 border-b border-brand-100 dark:border-brand-800">
          <h3 className="font-bold text-brand-950 dark:text-brand-50">صورة الترخيص</h3>
        </div>
        <div className="p-6 space-y-4">
          {data.license_image ? (
            <div className="relative">
              {data.license_image.startsWith('data:application/pdf') || data.license_image.startsWith('data:application/octet') ? (
                <div className="relative">
                  <embed src={data.license_image} type="application/pdf" className="w-full rounded-xl border border-brand-200 dark:border-brand-700" style={{ height: 400 }} />
                  <button onClick={() => set('license_image', '')} className="absolute top-2 left-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700" title="حذف الملف"><X size={14} /></button>
                </div>
              ) : (
                <div className="relative inline-block">
                  <img src={data.license_image} alt="صورة الترخيص" className="max-h-64 rounded-xl border border-brand-200 dark:border-brand-700 object-contain" />
                  <button onClick={() => set('license_image', '')} className="absolute top-2 left-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700" title="حذف الصورة"><X size={14} /></button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-brand-500 dark:text-brand-400">لم يتم رفع ملف الترخيص بعد</div>
          )}
          <input ref={licFileRef} type="file" accept="*" hidden onChange={handleLicenseUpload} />
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={() => licFileRef.current?.click()} disabled={licBusy} className="btn-secondary">
              {licBusy ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              {data.license_image ? 'تغيير الملف' : 'رفع ملف الترخيص'}
            </button>
            <span className="text-xs text-brand-400 dark:text-brand-500">PDF أو صورة أو أي ملف — حتى ١٥ ميجابايت</span>
          </div>
        </div>
      </div>

      {/* Regulations */}
      <div className="card">
        <div className="px-6 py-3 border-b border-brand-100 dark:border-brand-800">
          <h3 className="font-bold text-brand-950 dark:text-brand-50">اللائحة الخاصة بالعائلة</h3>
        </div>
        <div className="p-6">
          <textarea
            className="input w-full"
            rows={8}
            value={data.regulations || ''}
            onChange={e => set('regulations', e.target.value)}
            placeholder="أدخل نص اللائحة الخاصة بالعائلة..."
          />
        </div>
      </div>

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-3 ${msg.ok ? 'bg-emerald-50 text-emerald-700 dark:text-emerald-400 border border-emerald-200' : 'bg-red-50 text-red-700 dark:text-red-400 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <button onClick={save} disabled={busy} className="btn-primary w-full !py-3">
        {busy ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} حفظ الإعدادات
      </button>
    </div>
  )
}

function GatewayStatus() {
  const [info, setInfo] = useState<any>(null)
  useEffect(() => { api.settings.publicGet().then(r => setInfo(r.settings || {})) }, [])
  if (!info) return null
  const on = !!info.gateway_enabled
  return (
    <div className={`card card-body flex items-start gap-3 ${on ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/40 border-amber-200'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${on ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:text-amber-400'}`}>
        {on ? <CreditCard size={20} /> : <AlertCircle size={20} />}
      </div>
      <div className="flex-1">
        <div className="font-bold text-brand-950 dark:text-brand-50">
          بوابة الدفع: {on ? 'مفعّلة' : 'غير مفعّلة'}
          {on && info.gateway_provider && <span className="text-sm text-brand-500 dark:text-brand-400 mr-2">({info.gateway_provider})</span>}
        </div>
        <p className="text-sm text-brand-700 dark:text-brand-300 mt-1">
          {on
            ? 'الأعضاء يدفعون بالبطاقة مباشرة. الصندوق يتحمّل الرسوم (~1.5–2.2%).'
            : 'لتفعيل الدفع بالبطاقة، أضف PAYMENT_API_KEY في Environment Variables من لوحة Vercel.'}
        </p>
      </div>
    </div>
  )
}
