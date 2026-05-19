'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { Save, Loader2, CreditCard, AlertCircle } from 'lucide-react'

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
      { k: 'email',           l: 'البريد الإلكتروني' },
    ],
  },
]

export default function Settings() {
  const [data, setData] = useState<any>({})
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<any>(null)

  useEffect(() => {
    api.settings.all().then(r => setData(r.settings || {}))
  }, [])
  const set = (k: string, v: string) => setData((d: any) => ({ ...d, [k]: v }))

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
        <h1 className="font-display text-2xl font-extrabold text-brand-950">إعدادات الصندوق</h1>
        <p className="text-brand-600 text-sm">هذه القيم تظهر للأعضاء عند إجراء الدفعات</p>
      </div>

      <GatewayStatus />

      {GROUPS.map(g => (
        <div key={g.title} className="card">
          <div className="px-6 py-3 border-b border-brand-100"><h3 className="font-bold text-brand-950">{g.title}</h3></div>
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

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-3 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
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
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${on ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        {on ? <CreditCard size={20} /> : <AlertCircle size={20} />}
      </div>
      <div className="flex-1">
        <div className="font-bold text-brand-950">
          بوابة الدفع: {on ? 'مفعّلة' : 'غير مفعّلة'}
          {on && info.gateway_provider && <span className="text-sm text-brand-500 mr-2">({info.gateway_provider})</span>}
        </div>
        <p className="text-sm text-brand-700 mt-1">
          {on
            ? 'الأعضاء يدفعون بالبطاقة مباشرة. الصندوق يتحمّل الرسوم (~1.5–2.2%).'
            : 'لتفعيل الدفع بالبطاقة، أضف PAYMENT_API_KEY في Environment Variables من لوحة Vercel.'}
        </p>
      </div>
    </div>
  )
}
