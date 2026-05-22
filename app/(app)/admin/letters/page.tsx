'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api-client'
import { FilePen, Printer, RefreshCw, Loader2, Trash2, BookTemplate, Sparkles, Stamp } from 'lucide-react'

// ReactQuill needs SSR disabled (accesses document on load)
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

/* ─── Print CSS — matches the official PDF letterhead exactly ── */
const FUND_PRINT_CSS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 0; font-family: 'Cairo', sans-serif; background: white; direction: rtl; }
  @page { size: A4; margin: 0; }
  @media print { html, body { width: 210mm; height: 297mm; } }

  .a4 { width: 210mm; min-height: 297mm; background: white; display: flex; flex-direction: column; }

  /* ── Top navy bar ── */
  .top-bar { height: 13px; background: #1a365d; flex-shrink: 0; }

  /* ── Header ── */
  .lh-header {
    padding: 20px 36px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    direction: rtl;
    flex-shrink: 0;
  }
  .lh-logo img { height: 76px; object-fit: contain; display: block; }

  .lh-meta { direction: rtl; }
  .lh-meta-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 12.5px;
    color: #1a365d;
    direction: rtl;
  }
  .lh-meta-label {
    font-weight: 700;
    color: #334155;
    min-width: 66px;
    text-align: right;
    letter-spacing: 0.03em;
  }
  .lh-meta-value { font-weight: 600; color: #1a365d; }
  .lh-meta-value.empty {
    display: inline-block;
    min-width: 100px;
    border-bottom: 1px solid #94a3b8;
  }

  /* ── Separator line ── */
  .lh-sep { height: 1.5px; background: #1a365d; margin: 0 36px; opacity: 0.65; flex-shrink: 0; }

  /* ── Content area ── */
  .lh-content {
    flex: 1;
    padding: 26px 36px 16px;
    position: relative;
    overflow: hidden;
  }

  /* Watermark: right-side, very faint, warm tint */
  .lh-watermark {
    position: absolute;
    top: 50%;
    right: -15px;
    transform: translateY(-50%);
    width: 255px;
    opacity: 0.065;
    pointer-events: none;
    filter: sepia(35%) brightness(1.15);
  }

  .lh-body { position: relative; z-index: 1; }

  .recipient-block { margin-bottom: 20px; }
  .recipient-block p {
    font-size: 13.5px;
    color: #1a365d;
    font-weight: 600;
    margin: 0 0 3px;
    line-height: 1.8;
  }
  .recipient-block .honorific { color: #475569; font-weight: 500; }

  .subject-heading {
    font-size: 14px;
    font-weight: 900;
    color: #1a365d;
    margin: 16px 0 18px;
    padding: 8px 0;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    text-align: center;
  }

  .body-text {
    text-align: justify;
    line-height: 2.3;
    color: #1e293b;
    font-size: 13.5px;
    word-wrap: break-word;
  }
  .body-text p { margin: 0 0 10px; }
  .body-text li { margin-bottom: 5px; }
  .body-text ol, .body-text ul { padding-right: 1.4em; }

  .sign-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 44px;
    min-height: 80px;
    direction: ltr;      /* keep stamp left / signature right regardless of RTL body */
  }
  .sign-block { text-align: center; min-width: 175px; direction: rtl; }
  .sign-title { font-weight: 700; color: #1a365d; font-size: 12px; margin: 0 0 5px; }
  .sign-name {
    font-weight: 900;
    font-size: 15px;
    color: #1a365d;
    border-top: 1.5px solid #cbd5e1;
    padding-top: 7px;
    margin: 0;
  }

  /* ── Footer — beige background ── */
  .lh-footer {
    background: #ede8db;
    padding: 14px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  /* Repeating emblem watermarks in footer bg */
  .lh-footer-wm {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    opacity: 0.12;
    pointer-events: none;
  }
  .lh-footer-wm img { height: 48px; filter: sepia(50%) brightness(0.85); }

  .lh-footer-col { display: flex; flex-direction: column; gap: 5px; position: relative; z-index: 1; }

  .lh-footer-item {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11.5px;
    font-weight: 600;
    color: #1a365d;
  }
  .lh-ficon { width: 18px; height: 18px; object-fit: contain; opacity: 0.85; flex-shrink: 0; }

  /* ── Stamp ── */
  .stamp-wrap { display: flex; align-items: flex-end; padding-bottom: 4px; }
  .stamp-img  { width: 120px; object-fit: contain; opacity: 0.9; }

  /* ── Bottom navy bar ── */
  .bottom-bar { height: 13px; background: #1a365d; flex-shrink: 0; }
`

/* ─── Build HTML for print window ───────────────────────────── */
function buildPrintHTML(data: LetterForm, settings: any, origin: string, showStamp: boolean) {
  const phone       = settings.phone           || '053 96 69 988'
  const email       = settings.email           || 'info@aknafalqurba.com'
  const licenseNum  = settings.license_number  || '1200775200'
  const licenseDate = settings.license_date    || '11/07/1447هـ'

  const wm = `${origin}/brand/watermark.png`
  const logo = `${origin}/brand/logo.png`
  const emblem = `${origin}/brand/emblem.png`

  const metaVal = (v: string) =>
    v ? `<span class="lh-meta-value">${v}</span>`
      : `<span class="lh-meta-value empty">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`

  return `<div class="a4">
  <div class="top-bar"></div>
  <div class="lh-header">
    <div class="lh-logo">
      <img src="${logo}" alt="أكناف القربى" onerror="this.style.display='none'" />
    </div>
    <div class="lh-meta">
      <div class="lh-meta-row"><span class="lh-meta-label">الـرقـم:</span>${metaVal(data.reference)}</div>
      <div class="lh-meta-row"><span class="lh-meta-label">التـاريـخ:</span>${metaVal(data.date)}</div>
      <div class="lh-meta-row"><span class="lh-meta-label">الموضوع:</span>${metaVal(data.subject)}</div>
    </div>
  </div>
  <div class="lh-sep"></div>
  <div class="lh-content">
    <img class="lh-watermark" src="${wm}" alt="" aria-hidden="true"
         onerror="this.src='${logo}'" />
    <div class="lh-body">
      <div class="recipient-block">
        <p>السادة / ${data.recipient || ''}</p>
        <p class="honorific">حفظهم الله،،</p>
      </div>
      ${data.subject ? `<div class="subject-heading">الموضوع: ${data.subject}</div>` : ''}
      <div class="body-text">${data.body || ''}</div>
      <div class="sign-row">
        ${showStamp
          ? `<div class="stamp-wrap"><img class="stamp-img" src="${origin}/brand/stamp.png" alt="الختم الرسمي" onerror="this.style.display='none'" /></div>`
          : '<div></div>'}
        <div class="sign-block">
          ${data.signTitle ? `<p class="sign-title">${data.signTitle}</p>` : ''}
          ${data.signName  ? `<p class="sign-name">${data.signName}</p>`   : ''}
        </div>
      </div>
    </div>
  </div>
  <div class="lh-footer">
    <div class="lh-footer-wm">
      <img src="${emblem}" onerror="this.style.display='none'" />
      <img src="${emblem}" onerror="this.style.display='none'" />
      <img src="${emblem}" onerror="this.style.display='none'" />
      <img src="${emblem}" onerror="this.style.display='none'" />
      <img src="${emblem}" onerror="this.style.display='none'" />
      <img src="${emblem}" onerror="this.style.display='none'" />
    </div>
    <div class="lh-footer-col">
      ${phone ? `<div class="lh-footer-item">
        <img class="lh-ficon" src="${emblem}" onerror="this.style.display='none'" />
        <span>${phone}</span>
      </div>` : ''}
      ${email ? `<div class="lh-footer-item">
        <img class="lh-ficon" src="${emblem}" onerror="this.style.display='none'" />
        <span>${email}</span>
      </div>` : ''}
    </div>
    <div class="lh-footer-col">
      ${licenseNum ? `<div class="lh-footer-item">
        <img class="lh-ficon" src="${emblem}" onerror="this.style.display='none'" />
        <span>رقم الترخيص ${licenseNum}</span>
      </div>` : ''}
      ${licenseDate ? `<div class="lh-footer-item">
        <img class="lh-ficon" src="${emblem}" onerror="this.style.display='none'" />
        <span>تاريخ الترخيص ${licenseDate}</span>
      </div>` : ''}
    </div>
  </div>
  <div class="bottom-bar"></div>
</div>`
}

/* ─── Open print window ─────────────────────────────────────── */
function printLetter(html: string, title: string) {
  const w = window.open('', '_blank', 'width=900,height=1200')
  if (!w) { alert('يرجى السماح بفتح النوافذ المنبثقة'); return }
  w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>${FUND_PRINT_CSS}</style></head>
<body>${html}</body></html>`)
  w.document.close()
  w.onload = () => {
    const tryPrint = () => { w.focus(); w.print() }
    if ((w.document as any).fonts?.ready) {
      ;(w.document as any).fonts.ready.then(() => setTimeout(tryPrint, 200))
    } else {
      setTimeout(tryPrint, 600)
    }
  }
}

/* ─── Types ─────────────────────────────────────────────────── */
interface LetterForm {
  reference: string
  date:      string
  recipient: string
  subject:   string
  body:      string
  signName:  string
  signTitle: string
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

/* ─── Component ─────────────────────────────────────────────── */
export default function LetterGenerator() {
  const [user,     setUser]     = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [templates,setTemplates]= useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  const [data, setData] = useState<LetterForm>({
    reference: '',
    date:      new Date().toLocaleDateString('ar-SA-u-ca-islamic', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    recipient: '',
    subject:   '',
    body:      '',
    signName:  '',
    signTitle: '',
  })

  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveMeta,     setSaveMeta]     = useState({ category: 'إدارية عامة', title: '' })
  const [saving,       setSaving]       = useState(false)
  const [seeding,      setSeeding]      = useState(false)
  const [showStamp,    setShowStamp]    = useState(false)

  // Roles allowed to use the official stamp
  const STAMP_ROLES = ['admin', 'president', 'secretary']
  const canUseStamp = user && STAMP_ROLES.includes(user.role)

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
          signTitle: me.user.role === 'secretary'  ? 'أمين سر الصندوق'
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
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const html = buildPrintHTML(data, settings, origin, canUseStamp ? showStamp : false)
    printLetter(html, `خطاب_${data.recipient || 'الصندوق'}`)
  }

  /* ── Derived display values ── */
  const phone      = settings.phone          || '053 96 69 988'
  const email      = settings.email          || 'info@aknafalqurba.com'
  const licenseNum = settings.license_number || '1200775200'
  const licenseDate= settings.license_date   || '11/07/1447هـ'

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
        .ql-editor { min-height: 160px; font-size: 13px; direction: rtl; text-align: right; }
        .lp p { margin-bottom: 0.65rem; }
        .lp li { margin-bottom: 0.35rem; }
        .lp ol, .lp ul { padding-right: 1.4rem; }
      `}</style>

      <div className="flex flex-col lg:flex-row gap-6 min-h-[820px]">

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <div className="w-full lg:w-[360px] shrink-0 flex flex-col rounded-2xl shadow-2xl overflow-hidden
                        bg-gradient-to-b from-[#0f1e38] to-[#0a0f1e] text-white border border-white/5">

          {/* Sidebar header */}
          <div className="px-6 pt-6 pb-5 border-b border-white/10 bg-black/20">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-l from-[#c5a059] to-yellow-200 flex items-center gap-2">
              <FilePen className="text-[#c5a059]" size={20} /> منشئ الخطابات الرسمية
            </h2>
            <p className="text-xs text-white/50 mt-1">صندوق أكناف القربى — عائلة البادي</p>
          </div>

          {/* Sidebar controls */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Seed banner */}
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

            {/* Reference number */}
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-widest block mb-1">الرقم المرجعي</label>
              <input type="text" value={data.reference}
                onChange={e => setData({ ...data, reference: e.target.value })}
                placeholder="مثال: ص/2025/001"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-[#c5a059] transition placeholder:text-white/25" />
            </div>

            {/* Date */}
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-widest block mb-1">التاريخ</label>
              <input type="text" value={data.date}
                onChange={e => setData({ ...data, date: e.target.value })}
                placeholder="مثال: 11/07/1447هـ"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-[#c5a059] transition" />
            </div>

            {/* Recipient */}
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-widest block mb-1">المستلم</label>
              <input type="text" value={data.recipient}
                onChange={e => setData({ ...data, recipient: e.target.value })}
                placeholder="مثال: اللجنة التنفيذية"
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

            {/* Stamp toggle — only for admin / president / secretary */}
            {canUseStamp && (
              <button
                onClick={() => setShowStamp(s => !s)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition font-bold text-sm ${
                  showStamp
                    ? 'bg-[#1a365d]/80 border-[#1a365d] text-white shadow-[0_0_14px_rgba(26,54,93,0.4)]'
                    : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Stamp size={15} className={showStamp ? 'text-[#c5a059]' : 'text-white/50'} />
                  <span>الختم الرسمي للصندوق</span>
                </div>
                {/* Visual toggle pill */}
                <div className={`w-9 h-5 rounded-full transition-colors relative ${showStamp ? 'bg-[#c5a059]' : 'bg-white/20'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${showStamp ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </button>
            )}

            {/* Save as template */}
            <div className="border border-dashed border-white/20 rounded-xl p-4 bg-white/[0.02]">
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
              className="w-full bg-gradient-to-r from-[#c5a059] to-yellow-600 text-white py-3.5 rounded-xl font-bold
                         flex items-center justify-center gap-2 hover:opacity-90 transition
                         shadow-[0_0_20px_rgba(197,160,89,0.25)] hover:-translate-y-0.5 transform">
              <Printer size={18} /> طباعة / تصدير PDF
            </button>
          </div>
        </div>

        {/* ── A4 Preview ─────────────────────────────────────────── */}
        <div className="flex-1 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800
                        rounded-2xl overflow-y-auto p-6 md:p-10 flex justify-center items-start
                        shadow-inner border border-slate-300 dark:border-slate-600">
          {/* A4 sheet */}
          <div
            className="bg-white text-black shadow-[0_20px_60px_rgba(0,0,0,0.18)] ring-1 ring-slate-900/5 flex flex-col"
            style={{ width: '210mm', minHeight: '297mm' }}
          >
            {/* ── Top navy bar ── */}
            <div className="h-[13px] bg-[#1a365d] shrink-0" />

            {/* ── Header ── */}
            <div className="flex justify-between items-center px-9 pt-5 pb-4 shrink-0">
              {/* Logo — right side (RTL start) */}
              <img
                src="/brand/logo.png"
                alt="أكناف القربى"
                className="h-[76px] object-contain"
              />
              {/* Meta — left side */}
              <div className="text-right space-y-[6px]">
                {[
                  { label: 'الـرقـم:', value: data.reference },
                  { label: 'التـاريـخ:', value: data.date },
                  { label: 'الموضوع:', value: data.subject },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-baseline gap-2 text-[12.5px] justify-end">
                    <span className="font-semibold text-[#1a365d]">
                      {value || <span className="inline-block min-w-[80px] border-b border-slate-300">&nbsp;</span>}
                    </span>
                    <span className="font-bold text-slate-600 min-w-[62px] text-right tracking-wide">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Separator ── */}
            <div className="mx-9 shrink-0" style={{ height: '1.5px', background: '#1a365d', opacity: 0.65 }} />

            {/* ── Content area ── */}
            <div className="flex-1 px-9 pt-7 pb-4 relative overflow-hidden">
              {/* Watermark — right side, faint */}
              <img
                src="/brand/watermark.png"
                alt=""
                aria-hidden
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none select-none"
                style={{
                  right: '-12px',
                  width: '255px',
                  opacity: 0.065,
                  filter: 'sepia(35%) brightness(1.15)',
                }}
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).src = '/brand/logo.png'
                }}
              />

              {/* Letter content */}
              <div className="relative z-10">
                {/* Recipient */}
                <div className="mb-5">
                  <p className="text-[13.5px] font-semibold text-[#1a365d] leading-[1.8]">
                    السادة / {data.recipient || <span className="text-slate-300 font-normal">أدخل اسم المستلم</span>}
                  </p>
                  <p className="text-[13px] text-slate-500">حفظهم الله،،</p>
                </div>

                {/* Subject heading */}
                {data.subject && (
                  <div className="text-center text-[14px] font-black text-[#1a365d] py-2 mb-4"
                    style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    الموضوع: {data.subject}
                  </div>
                )}

                {/* Body */}
                <div
                  className="lp text-justify text-slate-800 text-[13.5px]"
                  style={{ lineHeight: 2.3, wordBreak: 'break-word', fontFamily: 'inherit' }}
                  dangerouslySetInnerHTML={{
                    __html: data.body ||
                      '<p style="color:#cbd5e1;font-style:italic">ابدأ بكتابة نص الخطاب في اللوحة الجانبية…</p>',
                  }}
                />

                {/* Signature + Stamp row — ltr so stamp=left, signature=right */}
                <div className="mt-12 flex items-end justify-between min-h-[88px]" style={{ direction: 'ltr' }}>
                  {/* Stamp — physical LEFT */}
                  {canUseStamp && showStamp
                    ? <img src="/brand/stamp.png" alt="الختم الرسمي" className="w-[120px] object-contain opacity-90" />
                    : <div />
                  }

                  {/* Signature — physical RIGHT */}
                  <div className="text-center min-w-[170px]" style={{ direction: 'rtl' }}>
                    {data.signTitle && (
                      <p className="text-[12px] font-bold text-[#1a365d] mb-[5px]">{data.signTitle}</p>
                    )}
                    {data.signName && (
                      <p className="text-[15px] font-black text-[#1a365d] pt-[7px] m-0"
                        style={{ borderTop: '1.5px solid #cbd5e1' }}>
                        {data.signName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Footer — beige ── */}
            <div
              className="relative px-9 py-[14px] flex justify-between items-center shrink-0 overflow-hidden"
              style={{ background: '#ede8db' }}
            >
              {/* Footer background watermarks */}
              <div className="absolute inset-0 flex items-center justify-center gap-5 opacity-[0.11] pointer-events-none select-none">
                {[...Array(6)].map((_, i) => (
                  <img key={i} src="/brand/emblem.png" alt="" className="h-[48px]"
                    style={{ filter: 'sepia(50%) brightness(0.85)' }} />
                ))}
              </div>

              {/* Left col: phone + email */}
              <div className="relative z-10 flex flex-col gap-[5px]">
                {phone && (
                  <div className="flex items-center gap-[7px] text-[11.5px] font-semibold text-[#1a365d]" dir="ltr">
                    <img src="/brand/emblem.png" alt="" className="w-[17px] h-[17px] object-contain opacity-80" />
                    <span>{phone}</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-[7px] text-[11.5px] font-semibold text-[#1a365d]" dir="ltr">
                    <img src="/brand/emblem.png" alt="" className="w-[17px] h-[17px] object-contain opacity-80" />
                    <span>{email}</span>
                  </div>
                )}
              </div>

              {/* Right col: license info */}
              <div className="relative z-10 flex flex-col gap-[5px]">
                {licenseNum && (
                  <div className="flex items-center gap-[7px] text-[11.5px] font-semibold text-[#1a365d]">
                    <img src="/brand/emblem.png" alt="" className="w-[17px] h-[17px] object-contain opacity-80" />
                    <span>رقم الترخيص {licenseNum}</span>
                  </div>
                )}
                {licenseDate && (
                  <div className="flex items-center gap-[7px] text-[11.5px] font-semibold text-[#1a365d]">
                    <img src="/brand/emblem.png" alt="" className="w-[17px] h-[17px] object-contain opacity-80" />
                    <span>تاريخ الترخيص {licenseDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Bottom navy bar ── */}
            <div className="h-[13px] bg-[#1a365d] shrink-0" />
          </div>
        </div>
      </div>
    </>
  )
}
