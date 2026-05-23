'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill-new/dist/quill.snow.css'
import { api } from '@/lib/api-client'
import {
  FilePen, Printer, Loader2, Trash2, BookOpen, Sparkles, Stamp,
  Hash, CalendarDays, AlignLeft, User, PenLine, Tag, ChevronDown,
} from 'lucide-react'

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

/* ─────────────────────────────────────────────────────────────
   PRINT STYLES
   Strategy: letterhead.png tiles as the background of every
   printed page.  Dynamic text is overlaid at calibrated
   positions that match the pre-printed labels on the PNG.
───────────────────────────────────────────────────────────── */
const PRINT_CSS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; padding: 0;
    font-family: 'Cairo', sans-serif;
    direction: rtl;
  }
  @page { size: A4 portrait; margin: 0; }

  /* ── Each printed A4 page gets one complete letterhead tile ── */
  @media print {
    html {
      background: url(BG_URL) top left / 210mm 297mm repeat;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }

  /* ── Screen wrapper (single page preview) ── */
  .a4 {
    width: 210mm;
    min-height: 297mm;
    position: relative;
    background: url(BG_URL) top left / 100% 100% no-repeat;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Metadata values — overlaid on pre-printed header labels ── */
  /* Positions calibrated to match الرقم / التاريخ / الموضوع lines */
  .mv { position: absolute; direction: rtl; text-align: right; color: #1a365d; font-weight: 600; font-size: 11px; left: 10mm; width: 48mm; }
  .mv-ref  { top: 22mm; }
  .mv-date { top: 26.5mm; }
  .mv-subj { top: 30.5mm; }

  /* ── Letter body — safe zone between header and footer ── */
  .lh-body {
    padding: 38mm 36mm 54mm;
  }

  .recipient p { font-size: 13.5px; color: #1a365d; font-weight: 600; line-height: 1.8; margin: 0 0 3px; }
  .recipient .hon { color: #475569; font-weight: 500; }
  .recipient { margin-bottom: 20px; }

  .subject-heading {
    font-size: 14px; font-weight: 900; color: #1a365d;
    text-align: center;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    padding: 7px 0; margin: 16px 0 18px;
  }

  .body-text {
    text-align: justify; line-height: 2.3;
    color: #1e293b; font-size: 13.5px;
    word-wrap: break-word;
  }
  .body-text p { margin: 0 0 10px; }
  .body-text li { margin-bottom: 5px; }
  .body-text ol, .body-text ul { padding-right: 1.4em; }

  /* ── Signature + stamp row ── */
  .sign-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    direction: ltr;   /* stamp=left  signature=right */
    margin-top: 44px;
    min-height: 80px;
  }
  .stamp-img { width: 115px; object-fit: contain; opacity: 0.9; }
  .sign-block { text-align: center; min-width: 170px; direction: rtl; }
  .sign-title { font-weight: 700; color: #1a365d; font-size: 12px; margin: 0 0 5px; }
  .sign-name  {
    font-weight: 900; font-size: 15px; color: #1a365d;
    border-top: 1.5px solid #cbd5e1; padding-top: 7px; margin: 0;
  }
`

/* ─── Build print HTML ──────────────────────────────────────── */
function buildPrintHTML(
  data: LetterForm,
  origin: string,
  showStamp: boolean,
) {
  const bg = `${origin}/brand/letterhead.png`
  const css = PRINT_CSS.replace(/BG_URL/g, bg)

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head>
<meta charset="utf-8">
<title>خطاب — ${data.recipient || 'الصندوق'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>${css}</style>
</head><body>
<div class="a4">
  <!-- Metadata values on the pre-printed header labels -->
  ${data.reference ? `<span class="mv mv-ref">${data.reference}</span>`   : ''}
  ${data.date      ? `<span class="mv mv-date">${data.date}</span>`        : ''}
  ${data.subject   ? `<span class="mv mv-subj">${data.subject}</span>`     : ''}

  <!-- Letter body -->
  <div class="lh-body">
    <div class="recipient">
      <p>السادة / ${data.recipient || ''}</p>
      <p class="hon">حفظهم الله،،</p>
    </div>

    ${data.subject
      ? `<div class="subject-heading">الموضوع: ${data.subject}</div>`
      : ''}

    <div class="body-text">${data.body || ''}</div>

    <div class="sign-row">
      ${showStamp
        ? `<img class="stamp-img" src="${origin}/brand/stamp.png" alt="الختم" onerror="this.style.display='none'">`
        : '<div></div>'}
      <div class="sign-block">
        ${data.signTitle ? `<p class="sign-title">${data.signTitle}</p>` : ''}
        ${data.signName  ? `<p class="sign-name">${data.signName}</p>`   : ''}
      </div>
    </div>
  </div>
</div>
</body></html>`
}

/* ─── Open print window ─────────────────────────────────────── */
function printLetter(html: string) {
  const w = window.open('', '_blank', 'width=860,height=1180')
  if (!w) { alert('يرجى السماح بفتح النوافذ المنبثقة'); return }
  w.document.write(html)
  w.document.close()
  w.onload = () => {
    const go = () => { w.focus(); w.print() }
    const fonts = (w.document as any).fonts
    fonts?.ready ? fonts.ready.then(() => setTimeout(go, 150)) : setTimeout(go, 600)
  }
}

/* ─── Types ─────────────────────────────────────────────────── */
interface LetterForm {
  reference: string; date: string; recipient: string
  subject: string; body: string; signName: string; signTitle: string
}

const CATEGORIES = [
  'إدارية عامة', 'مالية', 'عضوية', 'دعم واجتماعي',
  'محاضر اجتماعات', 'إعلانات وأخبار',
]

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['clean'],
  ],
}

const STAMP_ROLES = ['admin', 'president', 'secretary']

/* ─── Component ─────────────────────────────────────────────── */
export default function LetterGenerator() {
  const [user,      setUser]      = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showStamp, setShowStamp] = useState(false)

  const [data, setData] = useState<LetterForm>({
    reference: '',
    date:      '',
    recipient: '',
    subject:   '',
    body:      '',
    signName:  '',
    signTitle: '',
  })

  const [showSave,  setShowSave]  = useState(false)
  const [saveMeta,  setSaveMeta]  = useState({ category: 'إدارية عامة', title: '' })
  const [saving,    setSaving]    = useState(false)
  const [seeding,   setSeeding]   = useState(false)
  const [catOpen,   setCatOpen]   = useState<string | null>(null)

  const canUseStamp = user && STAMP_ROLES.includes(user.role)

  /* ── bootstrap ── */
  useEffect(() => {
    Promise.all([
      api.auth.me().catch(() => null),
      api.letterTemplates.list().catch(() => ({ templates: [] })),
    ]).then(([me, t]) => {
      if (me?.user) {
        setUser(me.user)
        setData(d => ({
          ...d,
          signName:  me.user.full_name || '',
          signTitle: me.user.role === 'secretary'  ? 'أمين سر الصندوق'
            : me.user.role === 'treasurer' ? 'المدير المالي'
            : me.user.role === 'president' ? 'رئيس الصندوق'
            : me.user.role === 'admin'     ? 'مدير النظام'
            : '',
        }))
      }
      setTemplates(t?.templates || [])
    }).finally(() => setLoading(false))
  }, [])

  const grouped = templates.reduce<Record<string, any[]>>((acc, t) => {
    ;(acc[t.category] ||= []).push(t)
    return acc
  }, {})

  function loadTemplate(tpl: any) {
    setData(d => ({ ...d, subject: tpl.subject, body: tpl.body }))
    setSaveMeta({ category: tpl.category, title: tpl.title + ' — معدّل' })
  }

  async function saveTemplate() {
    if (!saveMeta.title.trim() || !data.body.replace(/<[^>]*>/g, '').trim()) return
    setSaving(true)
    try {
      await api.letterTemplates.create({ ...saveMeta, subject: data.subject, body: data.body })
      const r = await api.letterTemplates.list()
      setTemplates(r.templates || [])
      setShowSave(false)
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

  function handlePrint() {
    const origin = window.location.origin
    const html = buildPrintHTML(data, origin, canUseStamp ? showStamp : false)
    printLetter(html)
  }

  /* ── Field helper ── */
  const field = (
    label: string,
    icon: React.ReactNode,
    value: string,
    onChange: (v: string) => void,
    opts?: { placeholder?: string; type?: string },
  ) => (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 mb-1.5">
        {icon}{label}
      </label>
      <input
        type={opts?.type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={opts?.placeholder}
        className="w-full border border-slate-200 dark:border-brand-700 rounded-xl px-3 py-2 text-sm
                   bg-white dark:bg-brand-900 text-brand-950 dark:text-brand-50
                   focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d] transition"
      />
    </div>
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="animate-spin text-[#c5a059] mb-4" size={44} />
      <p className="font-bold text-brand-900 dark:text-brand-100">جاري تجهيز صانع الخطابات…</p>
    </div>
  )

  return (
    <>
      <style>{`
        /* Quill base overrides */
        .ql-toolbar.ql-snow {
          border-radius: 0.75rem 0.75rem 0 0 !important;
          border-color: #e2e8f0 !important;
          background: #f8fafc;
          direction: ltr;
        }
        .ql-container.ql-snow {
          border-radius: 0 0 0.75rem 0.75rem !important;
          border-color: #e2e8f0 !important;
          font-family: 'Cairo', sans-serif !important;
        }
        .ql-editor {
          min-height: 150px;
          font-size: 13.5px;
          direction: rtl;
          text-align: right;
          line-height: 2;
          font-family: 'Cairo', sans-serif !important;
        }
        .ql-editor.ql-blank::before { right: 12px; left: unset; color: #94a3b8; font-style: normal; }
        /* Fix Quill icon sizes */
        .ql-toolbar .ql-formats button { width: 24px; height: 24px; }
        .ql-toolbar .ql-formats button svg { width: 16px; height: 16px; }
        /* Letter preview styles */
        .lp p { margin-bottom: 0.65rem; }
        .lp li { margin-bottom: 0.35rem; }
        .lp ol, .lp ul { padding-right: 1.4rem; }
      `}</style>

      {/* Page title */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1a365d] flex items-center justify-center">
          <FilePen size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-brand-950 dark:text-brand-50">منشئ الخطابات الرسمية</h1>
          <p className="text-xs text-brand-500 dark:text-brand-400">صندوق أكناف القربى — عائلة البادي</p>
        </div>
        <button onClick={handlePrint}
          className="mr-auto flex items-center gap-2 bg-[#1a365d] hover:bg-[#c5a059] text-white
                     px-5 py-2.5 rounded-2xl font-bold text-sm transition shadow-lg hover:-translate-y-0.5 transform">
          <Printer size={16} /> طباعة / PDF
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div className="w-full xl:w-[340px] shrink-0 space-y-4">

          {/* Templates card */}
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-brand-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-brand-700 bg-[#1a365d]/5 dark:bg-[#1a365d]/20 flex items-center gap-2">
              <BookOpen size={15} className="text-[#1a365d] dark:text-[#c5a059]" />
              <span className="font-bold text-sm text-[#1a365d] dark:text-brand-100">النماذج الجاهزة</span>
            </div>
            <div className="p-4">
              {templates.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-xs text-brand-400 mb-3">لا توجد نماذج — أنشئ النماذج الرسمية دفعةً واحدة</p>
                  <button onClick={seedTemplates} disabled={seeding}
                    className="inline-flex items-center gap-1.5 bg-[#1a365d] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#c5a059] transition">
                    {seeding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {seeding ? 'جاري التهيئة…' : 'تهيئة النماذج الرسمية'}
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {Object.keys(grouped).map(cat => (
                    <div key={cat}>
                      <button
                        onClick={() => setCatOpen(c => c === cat ? null : cat)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-brand-800 transition text-xs font-bold text-brand-500 dark:text-brand-400"
                      >
                        <span>{cat}</span>
                        <ChevronDown size={13} className={`transition-transform ${catOpen === cat ? 'rotate-180' : ''}`} />
                      </button>
                      {catOpen === cat && (
                        <div className="mr-2 mt-1 space-y-0.5">
                          {grouped[cat].map(t => (
                            <div key={t.id} className="flex items-center justify-between group rounded-lg hover:bg-[#1a365d]/5 px-2 py-1 transition">
                              <button
                                onClick={() => loadTemplate(t)}
                                className="flex-1 text-right text-xs text-brand-700 dark:text-brand-300 hover:text-[#1a365d] dark:hover:text-[#c5a059] font-semibold truncate"
                              >
                                {t.title}
                              </button>
                              <button onClick={() => deleteTemplate(t.id)}
                                className="opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-600 p-0.5 shrink-0">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Letter details card */}
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-brand-700 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-brand-700 bg-[#1a365d]/5 dark:bg-[#1a365d]/20 flex items-center gap-2">
              <Tag size={15} className="text-[#1a365d] dark:text-[#c5a059]" />
              <span className="font-bold text-sm text-[#1a365d] dark:text-brand-100">بيانات الخطاب</span>
            </div>
            <div className="p-4 space-y-3">
              {field('الرقم المرجعي',  <Hash size={13}/>,         data.reference, v => setData({...data, reference: v}), { placeholder: 'ص/1446/001' })}
              {field('التاريخ',         <CalendarDays size={13}/>, data.date,      v => setData({...data, date: v}),      { placeholder: '11/07/1447هـ' })}
              {field('المستلم',         <User size={13}/>,         data.recipient, v => setData({...data, recipient: v}), { placeholder: 'اللجنة التنفيذية' })}
              {field('الموضوع',         <AlignLeft size={13}/>,    data.subject,   v => setData({...data, subject: v}))}
            </div>
          </div>

          {/* Body card */}
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-brand-700 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-brand-700 bg-[#1a365d]/5 dark:bg-[#1a365d]/20 flex items-center gap-2">
              <PenLine size={15} className="text-[#1a365d] dark:text-[#c5a059]" />
              <span className="font-bold text-sm text-[#1a365d] dark:text-brand-100">نص الخطاب</span>
            </div>
            <div className="p-4">
              <ReactQuill
                theme="snow"
                value={data.body}
                onChange={v => setData({...data, body: v})}
                modules={QUILL_MODULES}
                placeholder="اكتب نص الخطاب هنا…"
              />
            </div>
          </div>

          {/* Signature card */}
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-brand-700 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-brand-700 bg-[#1a365d]/5 dark:bg-[#1a365d]/20">
              <span className="font-bold text-sm text-[#1a365d] dark:text-brand-100">التوقيع</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {field('اسم الموقّع', null, data.signName,  v => setData({...data, signName: v}))}
              {field('المنصب',      null, data.signTitle, v => setData({...data, signTitle: v}))}
            </div>

            {/* Stamp toggle */}
            {canUseStamp && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => setShowStamp(s => !s)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition text-sm font-bold ${
                    showStamp
                      ? 'bg-[#1a365d] border-[#1a365d] text-white'
                      : 'bg-slate-50 dark:bg-brand-800 border-slate-200 dark:border-brand-600 text-brand-600 dark:text-brand-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Stamp size={15} className={showStamp ? 'text-[#c5a059]' : ''} />
                    الختم الرسمي للصندوق
                  </div>
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${showStamp ? 'bg-[#c5a059]' : 'bg-slate-300 dark:bg-brand-600'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${showStamp ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>
            )}

            {/* Save as template */}
            <div className="px-4 pb-4 border-t border-slate-100 dark:border-brand-700 pt-3">
              {!showSave ? (
                <button onClick={() => setShowSave(true)}
                  className="w-full text-xs font-bold text-[#1a365d] dark:text-[#c5a059] hover:underline flex items-center justify-center gap-1.5">
                  <FilePen size={13} /> حفظ النص كنموذج جديد
                </button>
              ) : (
                <div className="space-y-2">
                  <select value={saveMeta.category}
                    onChange={e => setSaveMeta({...saveMeta, category: e.target.value})}
                    className="w-full border border-slate-200 dark:border-brand-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-brand-900 text-brand-800 dark:text-brand-200">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" value={saveMeta.title} placeholder="اسم النموذج"
                    onChange={e => setSaveMeta({...saveMeta, title: e.target.value})}
                    className="w-full border border-slate-200 dark:border-brand-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-brand-900 text-brand-800 dark:text-brand-200 font-bold" />
                  <div className="flex gap-2">
                    <button onClick={saveTemplate} disabled={saving}
                      className="flex-1 bg-[#1a365d] text-white py-1.5 rounded-lg text-xs font-bold hover:bg-[#c5a059] transition flex items-center justify-center">
                      {saving ? <Loader2 className="animate-spin" size={13} /> : 'حفظ'}
                    </button>
                    <button onClick={() => setShowSave(false)}
                      className="px-3 bg-slate-100 dark:bg-brand-800 text-brand-600 dark:text-brand-300 py-1.5 rounded-lg text-xs font-bold">
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── A4 Preview ──────────────────────────────────────── */}
        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-2xl p-6 xl:p-8 overflow-auto
                        flex justify-center items-start shadow-inner border border-slate-300 dark:border-slate-600 min-h-[600px]">
          {/* A4 sheet with the actual letterhead as background */}
          <div
            className="relative shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-slate-900/5"
            style={{
              width: '210mm', minHeight: '297mm',
              backgroundImage: 'url(/brand/letterhead.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* ── Metadata values ── calibrated to match pre-printed labels */}
            <div className="absolute" style={{ top: '22mm', left: '10mm', width: '48mm' }}>
              <span className="block text-right text-[11px] font-semibold text-[#1a365d] leading-none">
                {data.reference || ''}
              </span>
            </div>
            <div className="absolute" style={{ top: '26.5mm', left: '10mm', width: '48mm' }}>
              <span className="block text-right text-[11px] font-semibold text-[#1a365d] leading-none">
                {data.date || ''}
              </span>
            </div>
            <div className="absolute" style={{ top: '30.5mm', left: '10mm', width: '48mm' }}>
              <span className="block text-right text-[11px] font-semibold text-[#1a365d] leading-none truncate">
                {data.subject || ''}
              </span>
            </div>

            {/* ── Letter body — safe zone ── */}
            <div style={{ padding: '38mm 36mm 54mm' }}>

              {/* Recipient */}
              <div className="mb-5">
                <p className="text-[13.5px] font-semibold text-[#1a365d] leading-[1.8]">
                  السادة /{' '}
                  {data.recipient
                    ? data.recipient
                    : <span className="text-slate-300 font-normal text-sm">اسم المستلم</span>}
                </p>
                <p className="text-[13px] text-slate-500">حفظهم الله،،</p>
              </div>

              {/* Subject heading */}
              {data.subject && (
                <div
                  className="text-center text-[14px] font-black text-[#1a365d] py-2 mb-4"
                  style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}
                >
                  الموضوع: {data.subject}
                </div>
              )}

              {/* Body */}
              <div
                className="lp text-[13.5px] text-slate-800"
                style={{ lineHeight: 2.3, textAlign: 'justify', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{
                  __html: data.body ||
                    '<p style="color:#cbd5e1;font-style:italic">ابدأ بكتابة نص الخطاب…</p>',
                }}
              />

              {/* Signature + Stamp */}
              <div
                className="mt-12 flex items-end justify-between"
                style={{ direction: 'ltr', minHeight: '80px' }}
              >
                {/* Stamp — physical left */}
                {canUseStamp && showStamp
                  ? <img src="/brand/stamp.png" alt="الختم" className="w-[115px] object-contain opacity-90" />
                  : <div />}

                {/* Signature — physical right */}
                <div className="text-center min-w-[165px]" style={{ direction: 'rtl' }}>
                  {data.signTitle && (
                    <p className="text-[12px] font-bold text-[#1a365d] mb-1">{data.signTitle}</p>
                  )}
                  {data.signName && (
                    <p
                      className="text-[15px] font-black text-[#1a365d] pt-[6px] m-0"
                      style={{ borderTop: '1.5px solid #cbd5e1' }}
                    >
                      {data.signName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
