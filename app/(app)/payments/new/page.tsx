'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { PAYMENT_TYPES } from '@/lib/utils'
import {
  Building2, Smartphone, CreditCard, Copy, Check,
  Upload, Loader2, ArrowRight, Sparkles, CheckCircle2, AlertCircle,
} from 'lucide-react'

export default function PaymentNew() {
  const router = useRouter()
  const [settings, setSettings] = useState<any>({})
  const [method,   setMethod]   = useState('bank_transfer')
  const [form,     setForm]     = useState<any>({
    amount: '', payment_type: 'subscription', reference: '', notes: '',
    period_year: new Date().getFullYear(), period_month: new Date().getMonth() + 1,
  })
  const [file,        setFile]        = useState<File | null>(null)
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null)
  const [extracting,  setExtracting]  = useState(false)
  const [extracted,   setExtracted]   = useState<any>(null)
  const [extractErr,  setExtractErr]  = useState('')
  const [busy,        setBusy]        = useState(false)
  const [error,       setError]       = useState('')
  const [copied,      setCopied]      = useState('')

  useEffect(() => {
    api.settings.publicGet().then(r => {
      setSettings(r.settings || {})
      if (r.settings?.subscription_amount && !form.amount) {
        setForm((f: any) => ({ ...f, amount: r.settings.subscription_amount }))
      }
    })
  }, [])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(''), 2000)
  }

  // Read file as base64 data URL, then call AI extraction
  async function handleReceiptFile(f: File) {
    setFile(f)
    setExtracted(null)
    setExtractErr('')

    // Only extract for bank_transfer and stc_pay
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setFileDataUrl(dataUrl)

      // Only call AI for image/PDF receipts
      if (!dataUrl.startsWith('data:image/') && !dataUrl.startsWith('data:application/pdf')) return

      setExtracting(true)
      try {
        const res = await fetch('/api/payments/extract-receipt', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ receipt: dataUrl }),
        })
        const json = await res.json()
        if (!res.ok) { setExtractErr('تعذّر الاستخراج الذكي — أدخل البيانات يدوياً'); return }

        const ext = json.extracted
        setExtracted(ext)

        // Pre-fill form fields with extracted data
        setForm((prev: any) => ({
          ...prev,
          ...(ext.amount    ? { amount:    String(ext.amount)    } : {}),
          ...(ext.reference ? { reference: ext.reference         } : {}),
          ...(ext.transfer_date ? {
            notes: prev.notes
              ? prev.notes
              : `تاريخ التحويل: ${ext.transfer_date}${ext.bank_name ? ` — ${ext.bank_name}` : ''}`,
          } : {}),
        }))
      } catch {
        setExtractErr('تعذّر الاستخراج الذكي — أدخل البيانات يدوياً')
      } finally {
        setExtracting(false)
      }
    }
    reader.readAsDataURL(f)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      if (method === 'gateway') {
        const r = await api.gateway.start({
          amount: form.amount,
          payment_type: form.payment_type,
          period_year: form.period_year, period_month: form.period_month,
          notes: form.notes, origin: window.location.origin,
        })
        if (r?.url) { window.location.href = r.url; return }
        throw new Error('تعذّر إنشاء فاتورة الدفع')
      }
      const fd = new FormData()
      fd.append('amount', form.amount)
      fd.append('method', method)
      fd.append('payment_type', form.payment_type)
      if (form.reference)    fd.append('reference', form.reference)
      if (form.notes)        fd.append('notes', form.notes)
      if (form.period_year)  fd.append('period_year',  String(form.period_year))
      if (form.period_month) fd.append('period_month', String(form.period_month))
      if (file)              fd.append('receipt', file)
      // Attach AI-extracted data for admin review
      if (extracted)         fd.append('ai_extracted', JSON.stringify(extracted))
      await api.payments.create(fd)
      router.push('/payments')
    } catch (err: any) { setError(err.message) }
    finally { setBusy(false) }
  }

  const requiresReceipt = method === 'bank_transfer' || method === 'stc_pay'
  const gatewayReady    = !!settings.gateway_enabled

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/payments" className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-950 dark:hover:text-brand-50 flex items-center gap-1 mb-2">
          <ArrowRight size={14} /> العودة لدفعاتي
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">دفعة جديدة</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">سدّد اشتراكك أو أضف تبرعاً للصندوق</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <MethodBtn icon={Building2}  label="تحويل بنكي" v="bank_transfer" cur={method} on={setMethod} />
        <MethodBtn icon={Smartphone} label="STC Pay"     v="stc_pay"       cur={method} on={setMethod} />
        <MethodBtn icon={CreditCard} label="بطاقة دفع"   v="gateway"       cur={method} on={setMethod} />
      </div>

      {method === 'bank_transfer' && (
        <div className="card card-body bg-brand-50/40 dark:bg-brand-800/30">
          <h3 className="font-bold text-brand-950 dark:text-brand-50 mb-3">بيانات التحويل البنكي</h3>
          <KV k="اسم الحساب" v={settings.bank_account_name} copyKey="acc" copied={copied} onCopy={copy} />
          <KV k="البنك"      v={settings.bank_name} />
          <KV k="IBAN" v={settings.bank_iban} copyKey="iban" copied={copied} onCopy={copy} mono />
          <div className="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-lg px-3 py-2">
            بعد التحويل، ارفع صورة الإيصال أدناه. سيستخرج النظام البيانات آلياً وتراجعها لجنة الصندوق.
          </div>
        </div>
      )}

      {method === 'stc_pay' && (
        <div className="card card-body bg-brand-50/40 dark:bg-brand-800/30">
          <h3 className="font-bold text-brand-950 dark:text-brand-50 mb-3">تحويل عبر STC Pay</h3>
          <KV k="الاسم" v={settings.bank_account_name} />
          <KV k="رقم STC Pay" v={settings.stc_pay_number} copyKey="stc" copied={copied} onCopy={copy} mono />
          <div className="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-lg px-3 py-2">
            بعد التحويل، ارفع صورة الإيصال وسيُستخرج المبلغ ورقم العملية آلياً.
          </div>
        </div>
      )}

      {method === 'gateway' && (
        <div className={`card card-body ${gatewayReady
          ? 'bg-emerald-50/40 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
          : 'bg-gold-50/40 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800'}`}>
          <h3 className="font-bold text-brand-950 dark:text-brand-50 mb-2">الدفع المباشر بالبطاقة</h3>
          {gatewayReady ? (
            <>
              <p className="text-sm text-brand-700 dark:text-brand-300 mb-2">
                ادفع مباشرة باستخدام <strong>مدى</strong> أو <strong>فيزا/ماستركارد</strong> أو <strong>Apple Pay</strong> عبر بوابة آمنة.
              </p>
              <p className="text-xs text-brand-600 dark:text-brand-400">يتحمّل الصندوق رسوم البوابة — أنت تدفع المبلغ كاملاً بدون أي زيادة.</p>
            </>
          ) : (
            <p className="text-sm text-brand-700 dark:text-brand-300">سيتم تفعيل الدفع المباشر بالبطاقة بعد إتمام التسجيل التجاري. مؤقتاً اختر التحويل البنكي أو STC Pay.</p>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="card card-body space-y-4">

        {/* Receipt upload first for bank_transfer / stc_pay — drives AI extraction */}
        {requiresReceipt && (
          <div>
            <label className="label">إيصال التحويل *</label>
            <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-6 cursor-pointer transition ${
              file
                ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/20'
                : 'border-brand-200 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-800/50'
            }`}>
              {extracting ? (
                <>
                  <Loader2 className="animate-spin text-brand-500" size={20} />
                  <span className="text-sm text-brand-700 dark:text-brand-300">جاري استخراج البيانات بالذكاء الاصطناعي…</span>
                </>
              ) : file ? (
                <>
                  <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />
                  <span className="text-sm text-brand-700 dark:text-brand-300">{file.name}</span>
                </>
              ) : (
                <>
                  <Upload className="text-brand-400 dark:text-brand-500" size={20} />
                  <span className="text-sm text-brand-700 dark:text-brand-300">اضغط لرفع صورة الإيصال (JPG / PNG / PDF)</span>
                </>
              )}
              <input
                type="file" hidden accept="image/*,application/pdf"
                required={requiresReceipt}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleReceiptFile(f)
                }}
              />
            </label>

            {/* AI extraction result banner */}
            {extracted && !extracting && (
              <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-700/60 bg-emerald-50/60 dark:bg-emerald-900/20 px-4 py-3 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs mb-2">
                  <Sparkles size={13} />
                  تم استخراج البيانات من الإيصال تلقائياً — راجع وعدّل إن احتجت
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-emerald-900 dark:text-emerald-200">
                  {extracted.amount        && <span>المبلغ: <strong>{extracted.amount} ر.س</strong></span>}
                  {extracted.reference     && <span>رقم العملية: <strong className="font-mono">{extracted.reference}</strong></span>}
                  {extracted.transfer_date && <span>تاريخ التحويل: <strong>{extracted.transfer_date}</strong></span>}
                  {extracted.bank_name     && <span>الجهة: <strong>{extracted.bank_name}</strong></span>}
                  {extracted.sender_name   && <span>المُرسِل: <strong>{extracted.sender_name}</strong></span>}
                </div>
              </div>
            )}

            {extractErr && (
              <div className="mt-2 flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle size={13} /> {extractErr}
              </div>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">
              المبلغ (ر.س) *
              {extracted?.amount != null && (
                <span className="text-emerald-600 dark:text-emerald-400 mr-1 text-xs font-normal">✓ مُستخرج من الإيصال</span>
              )}
            </label>
            <input
              className={`input ${extracted?.amount != null ? 'bg-emerald-50/50 dark:bg-emerald-900/20 cursor-not-allowed' : ''}`}
              type="number" min="1" step="0.01" required
              value={form.amount}
              readOnly={extracted?.amount != null}
              onChange={e => extracted?.amount == null && setForm({ ...form, amount: e.target.value })}
            />
            {extracted?.amount != null && (
              <p className="text-xs text-brand-500 dark:text-brand-400 mt-1">يُعدَّل من قِبَل المدير المالي عند المراجعة</p>
            )}
          </div>
          <div>
            <label className="label">نوع الدفعة</label>
            <select className="input" value={form.payment_type}
              onChange={e => setForm({ ...form, payment_type: e.target.value })}>
              {Object.entries(PAYMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">السنة</label>
            <input className="input" type="number" value={form.period_year}
              onChange={e => setForm({ ...form, period_year: e.target.value })} />
          </div>
          <div>
            <label className="label">الشهر</label>
            <select className="input" value={form.period_month}
              onChange={e => setForm({ ...form, period_month: e.target.value })}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">
              رقم المرجع / العملية
              {extracted?.reference && (
                <span className="text-emerald-600 dark:text-emerald-400 mr-1 text-xs font-normal">✓ مُستخرج من الإيصال</span>
              )}
            </label>
            <input
              className={`input font-mono ${extracted?.reference ? 'bg-emerald-50/50 dark:bg-emerald-900/20 cursor-not-allowed' : ''}`}
              placeholder="REF12345"
              value={form.reference}
              readOnly={!!extracted?.reference}
              onChange={e => !extracted?.reference && setForm({ ...form, reference: e.target.value })}
            />
            {extracted?.reference && (
              <p className="text-xs text-brand-500 dark:text-brand-400 mt-1">يُعدَّل من قِبَل المدير المالي عند المراجعة</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="label">ملاحظات</label>
            <textarea className="input" rows={3}
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
        <button type="submit" disabled={busy || extracting || (method === 'gateway' && !gatewayReady)} className="btn-primary w-full !py-3">
          {busy && <Loader2 className="animate-spin" size={18} />}
          {method === 'gateway'
            ? (gatewayReady ? 'الانتقال إلى صفحة الدفع' : 'بوابة الدفع غير مفعّلة بعد')
            : 'إرسال الدفعة'}
        </button>
      </form>
    </div>
  )
}

function MethodBtn({ icon: Icon, label, v, cur, on }: any) {
  const active = v === cur
  return (
    <button type="button" onClick={() => on(v)}
      className={`card card-body !p-4 flex items-center gap-3 transition ${
        active
          ? 'ring-2 ring-gold-400 bg-brand-50/50 dark:bg-brand-800/50'
          : 'hover:bg-brand-50/30 dark:hover:bg-brand-800/30'
      }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        active
          ? 'bg-brand-950 dark:bg-gold-500 text-white dark:text-brand-950'
          : 'bg-brand-100 dark:bg-brand-700 text-brand-700 dark:text-brand-300'
      }`}>
        <Icon size={20} />
      </div>
      <span className="font-semibold text-brand-950 dark:text-brand-50 text-sm">{label}</span>
    </button>
  )
}

function KV({ k, v, copyKey, copied, onCopy, mono }: any) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-brand-100/60 dark:border-brand-700/60 last:border-0">
      <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">{k}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold text-brand-950 dark:text-brand-50 ${mono ? 'font-mono' : ''}`}>{v || '—'}</span>
        {copyKey && v && (
          <button type="button" onClick={() => onCopy(v, copyKey)}
            className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-200 p-1 rounded hover:bg-brand-100/60 dark:hover:bg-brand-700/60">
            {copied === copyKey ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}
