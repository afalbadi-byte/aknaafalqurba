'use client'
import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api-client'
import { FilePen, Printer, RefreshCw, Loader2, Trash2, BookTemplate, Sparkles } from 'lucide-react'

// ReactQuill needs SSR disabled (accesses document on load)
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

/* ─── Print CSS ────────────────────────────────────────────── */
const FUND_PRINT_CSS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 0; font-family: 'Cairo', sans-serif; background: white; direction: rtl; }
  @page { size: A4; margin: 0; }
  @media print {
    html, body { width: 210mm; height: 297mm; }
    .page-break { page-break-after: always; }
  }
  .a4 { width: 210mm; min-height: 297mm; background: white; position: relative; display: flex; flex-direction: column; }
  .top-bar { height: 10px; display: flex; }
  .top-bar .navy { background: #1a365d; flex: 3; }
  .top-bar .gold  { background: #c5a059; flex: 1; }
  .header { padding: 28px 40px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
  .logo-wrap img { height: 90px; object-fit: contain; }
  .header-info { text-align: left; border-left: 4px solid #c5a059; padding-left: 20px; }
  .header-info h1 { font-size: 22px; font-weight: 900; color: #1a365d; margin: 0 0 4px; }
  .header-info .tagline { color: #c5a059; font-size: 12px; font-weight: 700; margin: 0 0 4px; }
  .header-info .license { color: #94a3b8; font-size: 10px; margin: 0; font-family: monospace; }
  .content { flex: 1; padding: 28px 40px 20px; position: relative; }
  .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; width: 60%; pointer-events: none; }
  .meta-row { display: flex; justify-content: flex-end; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px dashed #e2e8f0; font-size: 13px; color: #475569; }
  .recipient-box { border-right: 4px solid #c5a059; padding: 10px 16px; background: linear-gradient(to left, #f8fafc, transparent); border-radius: 0 12px 12px 0; margin-bottom: 20px; }
  .recipient-box h3 { font-size: 18px; font-weight: 700; color: #1a365d; margin: 0 0 4px; line-height: 1.6; }
  .recipient-box .honorific { color: #c5a059; font-size: 14px; display: block; margin-top: 2px; }
  .subject-pill { text-align: center; margin-bottom: 24px; }
  .subject-pill span { display: inline-block; border: 2px solid rgba(26,54,93,0.15); padding: 7px 28px; border-radius: 999px; font-size: 16px; font-weight: 900; color: #1a365d; background: white; }
  .body-text { text-align: justify; line-height: 2.4; color: #1e293b; font-size: 14.5px; font-family: 'Amiri', serif; word-wrap: break-word; }
  .body-text p { margin: 0 0 10px; }
  .body-text li { margin-bottom: 6px; }
  .sign-row { display: flex; justify-content: flex-end; align-items: flex-end; padding: 0 20px; margin-top: 40px; min-height: 100px; }
  .sign-block { text-align: center; }
  .sign-title { font-weight: 700; color: #c5a059; font-size: 13px; margin: 0 0 8px; letter-spacing: 0.05em; }
  .sign-name { font-weight: 900; font-size: 18px; color: #1a365d; border-top: 2px solid #e2e8f0; padding-top: 8px; min-width: 200px; margin: 0; }
  .footer { margin-top: auto; padding: 0 28px 28px; }
  .footer-inner { background: #1a365d; border-radius: 16px; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; color: white; }
  .footer-left .name { font-weight: 700; color: #c5a059; font-size: 13px; }
  .footer-left .addr { color: rgba(255,255,255,0.7); font-size: 11px; margin-top: 3px; }
  .footer-right { text-align: left; font-size: 12px; direction: ltr; }
  .footer-right span { display: block; color: rgba(255,255,255,0.85); }
  .footer-right span b { color: #c5a059; }
`

/* ─── Print Function ────────────────────────────────────────── */
function printLetter(html: string, title: string, settings: any) {
  const w = window.open('', '_blank', 'width=900,height=1200')
  if (!w) { alert('يرجى السماح بفتح النوافذ المنبثقة'); return }
  const fundName    = settings.fund_name    || 'صندوق أكناف القربى'
  const familyName  = settings.family_name  || 'عائلة البادي'
  const phone       = settings.phone        || ''
  const email       = settings.email        || ''
  const licenseNum  = settings.license_number || ''
  const supervised  = settings.supervised_by || 'المركز الوطني لتنمية القطاع غير الربحي'

  w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
<style>${FUND_PRINT_CSS}</style></head>
<body>${html}</body></html>`)
  w.document.close()
  w.onload = () => {
    const tryPrint = () => { w.focus(); w.print() }
    if (w.document.fonts?.ready) {
      w.document.fonts.ready.then(() => setTimeout(tryPrint, 200))
    } else {
      setTimeout(tryPrint, 600)
    }
  }
}

function buildPrintHTML(data: FormData, settings: any) {
  const fundName   = settings.fund_name   || 'صندوق أكناف القربى'
  const familyName = settings.family_name || 'عائلة البادي'
  const phone      = settings.phone       || ''
  const email      = settings.email       || ''
  const licenseNum = settings.license_number || ''

  return `<div class="a4">
  <div class="top-bar"><div class="navy"></div><div class="gold"></div></div>
  <div class="header">
    <div class="logo-wrap"><img src="/logo.png" alt="${fundName}" onerror="this.style.display='none'" /></div>
    <div class="header-info">
      <h1>${fundName} — ${familyName}</h1>
      <p class="tagline">منظمة غير ربحية مرخصة</p>
      ${licenseNum ? `<p class="license">رقم الترخيص: ${licenseNum}</p>` : ''}
    </div>
  </div>
  <div class="content">
    <div class="meta-row">
      <span><strong>التاريخ:</strong>&nbsp;${data.date}</span>
    </div>
    <div class="recipient-box">
      <h3>السادة / ${data.recipient}</h3>
      <span class="honorific">المحترمين،،</span>
    </div>
    ${data.subject ? `<div class="subject-pill"><span>الموضوع: ${data.subject}</span></div>` : ''}
    <div class="body-text">${data.body}</div>
    <div class="sign-row">
      <div class="sign-block">
        <p class="sign-title">${data.signTitle}</p>
        <p class="sign-name">${data.signName}</p>
      </div>
    </div>
  </div>
  <div class="footer">
    <div class="footer-inner">
      <div class="footer-left">
        <div class="name">${fundName}</div>
        <div class="addr">المملكة العربية السعودية</div>
      </div>
      <div class="footer-right" dir="ltr">
        ${phone ? `<span><b>📞</b> ${phone}</span>` : ''}
        ${email ? `<span><b>✉</b> ${email}</span>` : ''}
      </div>
    </div>
  </div>
</div>`
}

interface FormData {
  date: string; recipient: string; subject: string
  body: string; signName: string; signTitle: string
}

const CATEGORIES = [
  'إدارية عامة', 'مالية', 'عضوية', 'دعم واجتماعي',
  'محاضر اجتماعات', 'إعلانات وأخبار',
]

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link'], ['clean'],
  ],
}

export default function LetterGenerator() {
  const [user,      setUser]      = useState<any>(null)
  const [settings,  setSettings]  = useState<any>({})
  const [templates, setTemplates] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  const [data, setData] = useState<FormData>({
    date:      new Date().toISOString().split('T')[0],
    recipient: 'اللجنة التنفيذية',
    subject:   '',
    body:      '',
    signName:  '',
    signTitle: '',
  })

  const [showSaveForm,  setShowSaveForm]  = useState(false)
  const [saveMeta,      setSaveMeta]      = useState({ category: 'إدارية عامة', title: '' })
  const [saving,        setSaving]        = useState(false)
  const [seeding,       setSeeding]       = useState(false)

  /* ── load user + settings + templates ── */
  useEffect(() => {
    Promise.all([
      api.auth.me().catch(() => null),
      api.settings.publicGet().catch(() => ({ settings: {} })),
      api.letterTemplates.list().catch(() => ({ templates: [] })),
    ]).then(([me, s, t]) => {
      if (me?.user) {
        setUser(me.user)
        setData(prev => ({
          ...prev,
          signName:  me.user.full_name || '',
          signTitle: me.user.role === 'secretary' ? 'أمين سر الصندوق'
            : me.user.role === 'treasurer' ? 'المدير المالي'
            : me.user.role === 'president' ? 'رئيس الصندوق'
            : me.user.role === 'admin'     ? 'مدير النظام'
            : '',
        }))
      }
      setSettings(s?.settings || {})
      setTemplates(t?.templates || [])
    }).finally(() => setLoading(false))
  }, [])

  /* ── group templates by category ── */
  const grouped = templates.reduce<Record<string, any[]>>((acc, t) => {
    ;(acc[t.category] ||= []).push(t)
    return acc
  }, {})

  /* ── load template ── */
  function loadTemplate(val: string) {
    if (val === '') { setData(d => ({ ...d, subject: '', body: '' })); return }
    const tpl = templates.find(t => t.id.toString() === val)
    if (tpl) {
      setData(d => ({ ...d, subject: tpl.subject, body: tpl.body }))
      setSaveMeta({ category: tpl.category, title: tpl.title + ' — معدّل' })
      setShowSaveForm(false)
    }
  }

  /* ── save template ── */
  async function saveTemplate() {
    if (!saveMeta.title.trim()) return
    if (!data.body.replace(/<[^>]*>?/gm, '').trim()) return
    setSaving(true)
    try {
      await api.letterTemplates.create({ ...saveMeta, subject: data.subject, body: data.body })
      const r = await api.letterTemplates.list()
      setTemplates(r.templates || [])
      setShowSaveForm(false)
    } finally { setSaving(false) }
  }

  async function deleteTemplate(id: number) {
    if (!confirm('حذف هذا النموذج نهائياً؟')) return
    await api.letterTemplates.remove(id)
    setTemplates(ts => ts.filter(t => t.id !== id))
  }

  async function seedTemplates() {
    setSeeding(true)
    try {
      await api.letterTemplates.seed()
      const r = await api.letterTemplates.list()
      setTemplates(r.templates || [])
    } finally { setSeeding(false) }
  }

  /* ── print ── */
  function handlePrint() {
    const html = buildPrintHTML(data, settings)
    printLetter(html, `خطاب_${data.recipient || 'الصندوق'}`, settings)
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="animate-spin text-gold-500 mb-4" size={44} />
      <p className="font-bold text-brand-900 dark:text-brand-100">جاري تجهيز صانع الخطابات…</p>
    </div>
  )

  return (
    <>
      <style>{`
        .ql-container { font-family: 'Cairo', sans-serif !important; }
        .ql-editor { min-height: 180px; font-size: 14px; direction: rtl; text-align: right; }
        .quill-preview p { margin-bottom: 0.7rem; }
        .quill-preview li { margin-bottom: 0.4rem; }
        .quill-preview ol, .quill-preview ul { padding-right: 1.5rem; }
      `}</style>

      <div className="flex flex-col lg:flex-row gap-6 min-h-[820px]">

        {/* ── Sidebar ────────────────────────────────────── */}
        <div className="w-full lg:w-[360px] shrink-0 flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-b from-[#0f1e38] to-[#0a0f1e] text-white border border-white/5">

          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-white/10 bg-black/20">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-l from-[#c5a059] to-yellow-200 flex items-center gap-2">
              <FilePen className="text-[#c5a059]" size={20} /> منشئ الخطابات الرسمية
            </h2>
            <p className="text-xs text-white/50 mt-1">صندوق أكناف القربى — عائلة البادي</p>
          </div>

          {/* Controls */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Seed banner — shown when no templates loaded yet */}
            {templates.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#c5a059]/40 bg-[#c5a059]/5 p-4 text-center">
                <p className="text-xs text-white/60 mb-3">لا توجد نماذج جاهزة — يمكنك تهيئة النماذج الرسمية للصندوق دفعةً واحدة</p>
                <button onClick={seedTemplates} disabled={seeding}
                  className="flex items-center gap-2 mx-auto bg-[#c5a059] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-yellow-600 transition">
                  {seeding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {seeding ? 'جاري التهيئة…' : 'تهيئة النماذج الرسمية'}
                </button>
              </div>
            )}

            {/* Template selector */}
            <div>
              <label className="text-[10px] font-bold text-[#c5a059] uppercase tracking-widest block mb-1.5">
                <BookTemplate size={11} className="inline ml-1" />نموذج جاهز
              </label>
              <select
                onChange={e => loadTemplate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-[#c5a059] transition cursor-pointer hover:bg-white/10"
              >
                <option value="">✨ خطاب جديد (فارغ)</option>
                {Object.keys(grouped).map(cat => (
                  <optgroup key={cat} label={`── ${cat}`} className="text-white/70 bg-[#0a0f1e]">
                    {grouped[cat].map(t => (
                      <option key={t.id} value={t.id} className="text-white bg-[#0f1e38]">{t.title}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Delete button for templates */}
              {templates.length > 0 && (
                <div className="mt-2 max-h-28 overflow-y-auto space-y-1 pr-0.5">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-xs text-white/60 hover:text-white/90 group">
                      <span className="truncate">{t.title}</span>
                      <button onClick={() => deleteTemplate(t.id)}
                        className="opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-300 p-0.5">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-white/10" />

            {/* Date */}
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-widest block mb-1">التاريخ</label>
              <input type="date" value={data.date}
                onChange={e => setData({ ...data, date: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-[#c5a059] transition"
                style={{ colorScheme: 'dark' }} />
            </div>

            {/* Recipient */}
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-widest block mb-1">المستلم</label>
              <input type="text" value={data.recipient}
                onChange={e => setData({ ...data, recipient: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-[#c5a059] transition" />
            </div>

            {/* Subject */}
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-widest block mb-1">الموضوع</label>
              <input type="text" value={data.subject}
                onChange={e => setData({ ...data, subject: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm font-bold text-white outline-none focus:border-[#c5a059] transition" />
            </div>

            {/* Rich text body */}
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-widest block mb-1">نص الخطاب</label>
              <div className="bg-white rounded-xl overflow-hidden text-black border-2 border-transparent focus-within:border-[#c5a059]/50 transition-all">
                <ReactQuill
                  theme="snow"
                  value={data.body}
                  onChange={v => setData({ ...data, body: v })}
                  modules={QUILL_MODULES}
                  placeholder="اكتب نص الخطاب هنا…"
                />
              </div>
            </div>

            {/* Signature */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-white/50 uppercase tracking-widest block mb-1">اسم الموقّع</label>
                <input type="text" value={data.signName}
                  onChange={e => setData({ ...data, signName: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-[#c5a059] transition" />
              </div>
              <div>
                <label className="text-[10px] text-white/50 uppercase tracking-widest block mb-1">المنصب</label>
                <input type="text" value={data.signTitle}
                  onChange={e => setData({ ...data, signTitle: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-[#c5a059] transition" />
              </div>
            </div>

            {/* Save as template */}
            <div className="border border-dashed border-white/20 rounded-xl p-4 bg-white/3">
              {!showSaveForm ? (
                <button onClick={() => setShowSaveForm(true)}
                  className="w-full text-sm font-bold text-teal-400 hover:text-teal-300 transition flex items-center justify-center gap-2 py-1">
                  <FilePen size={14} /> حفظ كنموذج جديد
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-white/50 text-center">سيُحفظ النص الحالي كقالب</p>
                  <div>
                    <label className="text-[10px] text-white/50 block mb-1">التصنيف</label>
                    <select value={saveMeta.category}
                      onChange={e => setSaveMeta({ ...saveMeta, category: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm text-white outline-none focus:border-teal-500">
                      {CATEGORIES.map(c => <option key={c} className="text-black bg-white" value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/50 block mb-1">اسم النموذج</label>
                    <input type="text" value={saveMeta.title}
                      onChange={e => setSaveMeta({ ...saveMeta, title: e.target.value })}
                      placeholder="مثال: خطاب ترحيب عضو جديد"
                      className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm text-white outline-none focus:border-teal-500 font-bold" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveTemplate} disabled={saving}
                      className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-500 text-white py-2 rounded-lg font-bold text-sm hover:opacity-90 transition flex items-center justify-center">
                      {saving ? <RefreshCw className="animate-spin" size={14} /> : 'حفظ'}
                    </button>
                    <button onClick={() => setShowSaveForm(false)}
                      className="px-4 bg-white/10 text-white py-2 rounded-lg font-bold text-sm hover:bg-white/20 transition">
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Print button */}
          <div className="p-4 bg-black/30 border-t border-white/10">
            <button onClick={handlePrint}
              className="w-full bg-gradient-to-r from-[#c5a059] to-yellow-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-[0_0_20px_rgba(197,160,89,0.25)] hover:-translate-y-0.5 transform">
              <Printer size={18} /> طباعة / تصدير PDF
            </button>
          </div>
        </div>

        {/* ── A4 Preview ────────────────────────────────── */}
        <div className="flex-1 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl overflow-y-auto p-6 md:p-10 flex justify-center items-start shadow-inner border border-slate-300 dark:border-slate-600">
          <div
            className="bg-white text-black shadow-[0_20px_60px_rgba(0,0,0,0.18)] ring-1 ring-slate-900/5 overflow-hidden flex flex-col"
            style={{ width: '210mm', minHeight: '297mm' }}
          >
            {/* Top color bar */}
            <div className="h-2.5 flex">
              <div className="bg-[#1a365d]" style={{ flex: 3 }} />
              <div className="bg-[#c5a059]" style={{ flex: 1 }} />
            </div>

            {/* Header */}
            <div className="px-10 pt-8 pb-5 flex justify-between items-center border-b border-slate-100 relative">
              <div className="text-right">
                {/* Fund logo placeholder */}
                <div className="h-16 w-16 rounded-full bg-[#1a365d]/10 flex items-center justify-center">
                  <span className="text-[#1a365d] font-black text-xl">ص</span>
                </div>
              </div>
              <div className="text-left border-l-4 border-[#c5a059] pl-5">
                <h1 className="text-2xl font-black text-[#1a365d]">
                  {settings.fund_name || 'صندوق أكناف القربى'} — {settings.family_name || 'عائلة البادي'}
                </h1>
                <p className="text-[#c5a059] font-bold text-xs mt-1">منظمة غير ربحية مرخصة</p>
                {settings.license_number && (
                  <p className="text-slate-400 text-[10px] mt-0.5 font-mono">رقم الترخيص: {settings.license_number}</p>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 px-10 pt-7 pb-6 relative">
              {/* Watermark */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] text-[160px] font-black text-[#1a365d] pointer-events-none select-none leading-none">
                ص
              </div>

              {/* Date */}
              <div className="flex justify-end mb-8 pb-4 border-b border-dashed border-slate-200 text-sm text-slate-600">
                <span><strong>التاريخ:</strong> {data.date}</span>
              </div>

              {/* Recipient */}
              <div className="border-r-4 border-[#c5a059] pr-4 py-2 bg-gradient-to-l from-slate-50 to-transparent rounded-l-2xl mb-8">
                <h3 className="text-xl font-bold text-[#1a365d] leading-relaxed">
                  السادة / {data.recipient}
                  <span className="block text-[#c5a059] text-lg mt-1">المحترمين،،</span>
                </h3>
              </div>

              {/* Subject */}
              {data.subject && (
                <div className="flex justify-center mb-10">
                  <div className="border-2 border-[#1a365d]/10 px-10 py-2.5 rounded-full bg-white shadow-sm">
                    <span className="font-black text-lg text-[#1a365d]">الموضوع: {data.subject}</span>
                  </div>
                </div>
              )}

              {/* Letter body */}
              <div
                className="text-justify leading-[2.4] text-slate-800 text-[15px] quill-preview"
                style={{ fontFamily: 'serif', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: data.body || '<p class="text-slate-400 italic">ابدأ بكتابة نص الخطاب في اللوحة الجانبية…</p>' }}
              />

              {/* Signature */}
              <div className="mt-16 flex justify-end px-6 min-h-[100px] items-end">
                <div className="text-center">
                  <p className="font-bold text-[#c5a059] mb-2 text-sm tracking-wide">{data.signTitle}</p>
                  <p className="font-black text-xl text-[#1a365d] border-t-2 border-slate-200 pt-3 min-w-[200px]">{data.signName}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto px-8 pb-8">
              <div className="bg-[#1a365d] rounded-2xl px-6 py-4 flex justify-between items-center text-white">
                <div>
                  <p className="font-bold text-[#c5a059] text-sm">{settings.fund_name || 'صندوق أكناف القربى'}</p>
                  <p className="text-white/70 text-xs mt-0.5">المملكة العربية السعودية</p>
                </div>
                <div className="text-left text-xs space-y-1" dir="ltr">
                  {settings.phone && <span className="block text-white/80"><b className="text-[#c5a059]">📞</b> {settings.phone}</span>}
                  {settings.email && <span className="block text-white/80"><b className="text-[#c5a059]">✉</b> {settings.email}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
