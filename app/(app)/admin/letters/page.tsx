'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { Image } from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extension-placeholder'
import { api } from '@/lib/api-client'
import {
  FilePen, Printer, Loader2, Trash2, BookOpen, Sparkles, Stamp,
  Hash, CalendarDays, AlignLeft, User, PenLine, Tag, ChevronDown,
  Save, FolderOpen, Bold, Italic, UnderlineIcon, List, ListOrdered,
  AlignRight, AlignCenter, AlignJustify, Table2, ImageIcon, Heading2,
  X, FileText,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   PRINT STYLES
   Each printed A4 page gets one complete letterhead tile via
   @page margins + html background tiling.
   .a4 background is suppressed in print so html's tile shows.
───────────────────────────────────────────────────────────── */
const PRINT_CSS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 0; font-family: 'Cairo', sans-serif; direction: rtl; }

  @page { size: A4 portrait; margin: 38mm 18mm 54mm 18mm; }

  @media print {
    html {
      background: url(BG_URL) top left / 210mm 297mm repeat;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .a4 { background: none !important; padding: 0 !important; width: 100%; }
  }

  .a4 {
    width: 210mm;
    min-height: 297mm;
    position: relative;
    background: url(BG_URL) top left / 210mm 297mm repeat;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Metadata values — positions calibrated to reference box ── */
  /* Value column: x=72-155mm (left of the 160mm separator)      */
  .mv {
    position: absolute; direction: rtl; text-align: right;
    color: #1a365d; font-weight: 700; font-size: 10px;
    left: 72mm; width: 83mm;
  }
  .mv-ref  { top: 20mm; }
  .mv-date { top: 26.5mm; }
  .mv-subj { top: 31mm; }

  .lh-body { padding: 0; }

  .recipient p { font-size: 13.5px; color: #1a365d; font-weight: 600; line-height: 1.8; margin: 0 0 3px; }
  .recipient .hon { color: #475569; font-weight: 500; }
  .recipient { margin-bottom: 20px; }

  .subject-heading {
    font-size: 14px; font-weight: 900; color: #1a365d;
    text-align: center;
    border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;
    padding: 7px 0; margin: 16px 0 18px;
  }

  .body-text {
    text-align: justify; line-height: 2.3;
    color: #1e293b; font-size: 13.5px; word-wrap: break-word;
  }
  .body-text p { margin: 0 0 10px; }
  .body-text li { margin-bottom: 5px; }
  .body-text ol, .body-text ul { padding-right: 1.4em; }
  .body-text h2 { font-size: 15px; font-weight: 900; color: #1a365d; margin: 12px 0 8px; }
  .body-text table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
  .body-text th, .body-text td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; }
  .body-text th { background: #f1f5f9; font-weight: 700; color: #1a365d; }
  .body-text img { max-width: 100%; height: auto; }

  .sign-row {
    display: flex; justify-content: space-between; align-items: flex-end;
    direction: ltr; margin-top: 44px; min-height: 90px;
  }
  .sign-left  { display: flex; flex-direction: column; align-items: flex-start; }
  .stamp-img  { width: 160px; object-fit: contain; opacity: 0.9; }
  .sig-img    { width: 130px; object-fit: contain; margin-bottom: 4px; }
  .sign-block { text-align: center; min-width: 165px; direction: rtl; }
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
  signature?: string | null,
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
  ${data.reference ? `<span class="mv mv-ref">${data.reference}</span>` : ''}
  ${data.date      ? `<span class="mv mv-date">${data.date}</span>`      : ''}
  ${data.subject   ? `<span class="mv mv-subj">${data.subject}</span>`   : ''}

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
      <div class="sign-left">
        ${showStamp
          ? `<img class="stamp-img" src="${origin}/brand/stamp.png" alt="الختم" onerror="this.style.display='none'">`
          : ''}
      </div>
      <div class="sign-block">
        ${data.signTitle ? `<p class="sign-title">${data.signTitle}</p>` : ''}
        ${signature ? `<img class="sig-img" src="${signature}" alt="التوقيع">` : ''}
        ${data.signName ? `<p class="sign-name">${data.signName}</p>` : ''}
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
const STAMP_ROLES = ['admin', 'president', 'secretary']

/* ─── TipTap toolbar button ─────────────────────────────────── */
function ToolBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition
        ${active
          ? 'bg-[#1a365d] text-white'
          : 'hover:bg-slate-100 dark:hover:bg-brand-700 text-brand-600 dark:text-brand-300'}`}
    >
      {children}
    </button>
  )
}

/* ─── Component ─────────────────────────────────────────────── */
export default function LetterGenerator() {
  const [user,      setUser]      = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [savedLetters, setSavedLetters] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showStamp, setShowStamp] = useState(false)

  const [data, setData] = useState<LetterForm>({
    reference: '', date: '', recipient: '', subject: '',
    body: '', signName: '', signTitle: '',
  })

  const [showSave,  setShowSave]  = useState(false)
  const [saveMeta,  setSaveMeta]  = useState({ category: 'إدارية عامة', title: '' })
  const [saving,    setSaving]    = useState(false)
  const [seeding,   setSeeding]   = useState(false)
  const [catOpen,   setCatOpen]   = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'templates' | 'saved'>('templates')

  /* letter save state */
  const [showLetterSave, setShowLetterSave] = useState(false)
  const [letterSaveTitle, setLetterSaveTitle] = useState('')
  const [savingLetter, setSavingLetter] = useState(false)
  const [currentLetterId, setCurrentLetterId] = useState<number | null>(null)

  const canUseStamp = user && STAMP_ROLES.includes(user.role)
  const signature   = user?.signature || null

  /* ── TipTap editor ── */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'right' }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'اكتب نص الخطاب هنا…' }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[180px] outline-none text-[13.5px] leading-[2] text-brand-900 dark:text-brand-50',
        dir: 'rtl',
      },
    },
    onUpdate: ({ editor }) => {
      setData(d => ({ ...d, body: editor.getHTML() }))
    },
  })

  /* ── bootstrap ── */
  useEffect(() => {
    Promise.all([
      api.auth.me().catch(() => null),
      api.letterTemplates.list().catch(() => ({ templates: [] })),
      api.letters.list().catch(() => ({ letters: [] })),
    ]).then(([me, t, lts]) => {
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
      setSavedLetters(lts?.letters || [])
    }).finally(() => setLoading(false))
  }, [])

  const grouped = templates.reduce<Record<string, any[]>>((acc, t) => {
    ;(acc[t.category] ||= []).push(t)
    return acc
  }, {})

  function loadTemplate(tpl: any) {
    editor?.commands.setContent(tpl.body)
    setData(d => ({ ...d, subject: tpl.subject, body: tpl.body }))
    setSaveMeta({ category: tpl.category, title: tpl.title + ' — معدّل' })
  }

  function loadSavedLetter(lt: any) {
    setData({
      reference: lt.reference || '',
      date:      lt.date || '',
      recipient: lt.recipient || '',
      subject:   lt.subject || '',
      body:      lt.body || '',
      signName:  lt.sign_name || '',
      signTitle: lt.sign_title || '',
    })
    editor?.commands.setContent(lt.body || '')
    setShowStamp(lt.show_stamp || false)
    setCurrentLetterId(lt.id)
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

  async function deleteTpl(id: number) {
    if (!confirm('حذف هذا النموذج نهائياً؟')) return
    await api.letterTemplates.remove(id)
    setTemplates(ts => ts.filter(t => t.id !== id))
  }

  async function saveLetter() {
    setSavingLetter(true)
    try {
      const payload = {
        reference: data.reference, date: data.date,
        recipient: data.recipient, subject: data.subject,
        body: data.body, sign_name: data.signName, sign_title: data.signTitle,
        show_stamp: canUseStamp ? showStamp : false,
      }
      if (currentLetterId) {
        await api.letters.update(currentLetterId, payload)
      } else {
        const r = await api.letters.create(payload)
        setCurrentLetterId(r.letter.id)
      }
      const lts = await api.letters.list()
      setSavedLetters(lts.letters || [])
      setShowLetterSave(false)
      setLetterSaveTitle('')
    } finally { setSavingLetter(false) }
  }

  async function deleteLetter(id: number) {
    if (!confirm('حذف هذا الخطاب نهائياً؟')) return
    await api.letters.remove(id)
    setSavedLetters(lts => lts.filter(l => l.id !== id))
    if (currentLetterId === id) setCurrentLetterId(null)
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
    const html = buildPrintHTML(data, window.location.origin, canUseStamp ? showStamp : false, signature)
    printLetter(html)
  }

  /* Insert image into editor */
  function insertImage() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = e => {
        const src = e.target?.result as string
        editor?.chain().focus().setImage({ src }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  /* ── Field helper ── */
  const field = (
    label: string, icon: React.ReactNode, value: string,
    onChange: (v: string) => void, opts?: { placeholder?: string; type?: string },
  ) => (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 mb-1.5">
        {icon}{label}
      </label>
      <input
        type={opts?.type || 'text'} value={value}
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
        /* TipTap editor styles */
        .tiptap-editor .ProseMirror {
          min-height: 180px; padding: 12px; outline: none;
          direction: rtl; text-align: right;
          font-family: 'Cairo', sans-serif;
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder); color: #94a3b8;
          pointer-events: none; float: right; height: 0;
        }
        .tiptap-editor .ProseMirror table {
          border-collapse: collapse; width: 100%; margin: 8px 0;
        }
        .tiptap-editor .ProseMirror th,
        .tiptap-editor .ProseMirror td {
          border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right;
        }
        .tiptap-editor .ProseMirror th { background: #f1f5f9; font-weight: 700; }
        .tiptap-editor .ProseMirror img {
          max-width: 100%; height: auto; border-radius: 6px; margin: 4px 0;
        }
        .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol {
          padding-right: 1.4rem;
        }
        .tiptap-editor .ProseMirror h2 {
          font-size: 16px; font-weight: 900; color: #1a365d; margin: 12px 0 6px;
        }
        .tiptap-editor .ProseMirror h3 {
          font-size: 14px; font-weight: 700; color: #1a365d; margin: 10px 0 5px;
        }
        /* Letter preview styles */
        .lp p { margin-bottom: 0.65rem; }
        .lp li { margin-bottom: 0.35rem; }
        .lp ol, .lp ul { padding-right: 1.4rem; }
        .lp table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; }
        .lp th, .lp td { border: 1px solid #cbd5e1; padding: 4px 7px; text-align: right; }
        .lp th { background: #f8fafc; font-weight: 700; color: #1a365d; }
        .lp img { max-width: 100%; height: auto; }
        .lp h2 { font-size: 14px; font-weight: 900; color: #1a365d; margin: 10px 0 5px; }
      `}</style>

      {/* Page title */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-[#1a365d] flex items-center justify-center shrink-0">
          <FilePen size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-brand-950 dark:text-brand-50">منشئ الخطابات الرسمية</h1>
          <p className="text-xs text-brand-500 dark:text-brand-400">صندوق أكناف القربى — عائلة البادي</p>
        </div>
        <div className="mr-auto flex items-center gap-2 flex-wrap">
          {/* Save letter */}
          <button onClick={() => setShowLetterSave(true)}
            className="flex items-center gap-1.5 bg-[#c5a059] hover:bg-[#b8944f] text-white
                       px-4 py-2.5 rounded-2xl font-bold text-sm transition shadow">
            <Save size={15} /> حفظ الخطاب
          </button>
          {/* Print */}
          <button onClick={handlePrint}
            className="flex items-center gap-2 bg-[#1a365d] hover:bg-[#c5a059] text-white
                       px-5 py-2.5 rounded-2xl font-bold text-sm transition shadow-lg hover:-translate-y-0.5 transform">
            <Printer size={16} /> طباعة / PDF
          </button>
        </div>
      </div>

      {/* Save letter dialog */}
      {showLetterSave && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-[#1a365d] dark:text-brand-50 text-lg">حفظ الخطاب</h2>
              <button onClick={() => setShowLetterSave(false)}>
                <X size={18} className="text-brand-400" />
              </button>
            </div>
            <p className="text-sm text-brand-500 dark:text-brand-400 mb-4">
              {currentLetterId ? 'سيتم تحديث الخطاب المحفوظ.' : 'سيحفظ الخطاب مع كل بياناته لاسترجاعه لاحقاً.'}
            </p>
            <div className="flex gap-2">
              <button onClick={saveLetter} disabled={savingLetter}
                className="flex-1 bg-[#1a365d] hover:bg-[#c5a059] text-white py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
                {savingLetter ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {currentLetterId ? 'تحديث' : 'حفظ'}
              </button>
              <button onClick={() => setShowLetterSave(false)}
                className="px-4 bg-slate-100 dark:bg-brand-800 text-brand-600 dark:text-brand-300 py-2.5 rounded-xl font-bold text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div className="w-full xl:w-[340px] shrink-0 space-y-4">

          {/* Templates / Saved tabs */}
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-brand-700 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 dark:border-brand-700">
              {(['templates', 'saved'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold transition ${
                    activeTab === tab
                      ? 'bg-[#1a365d] text-white'
                      : 'text-brand-500 dark:text-brand-400 hover:bg-slate-50 dark:hover:bg-brand-800'}`}>
                  {tab === 'templates' ? <><BookOpen size={13} /> النماذج</> : <><FileText size={13} /> المحفوظة ({savedLetters.length})</>}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === 'templates' && (
                <>
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
                          <button onClick={() => setCatOpen(c => c === cat ? null : cat)}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-brand-800 transition text-xs font-bold text-brand-500 dark:text-brand-400">
                            <span>{cat}</span>
                            <ChevronDown size={13} className={`transition-transform ${catOpen === cat ? 'rotate-180' : ''}`} />
                          </button>
                          {catOpen === cat && (
                            <div className="mr-2 mt-1 space-y-0.5">
                              {grouped[cat].map(t => (
                                <div key={t.id} className="flex items-center justify-between group rounded-lg hover:bg-[#1a365d]/5 px-2 py-1 transition">
                                  <button onClick={() => loadTemplate(t)}
                                    className="flex-1 text-right text-xs text-brand-700 dark:text-brand-300 hover:text-[#1a365d] dark:hover:text-[#c5a059] font-semibold truncate">
                                    {t.title}
                                  </button>
                                  <button onClick={() => deleteTpl(t.id)}
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
                </>
              )}

              {activeTab === 'saved' && (
                <div className="space-y-1.5">
                  {savedLetters.length === 0 ? (
                    <p className="text-center text-xs text-brand-400 py-3">لا توجد خطابات محفوظة بعد</p>
                  ) : savedLetters.map(lt => (
                    <div key={lt.id} className={`flex items-center justify-between group rounded-lg px-2 py-1.5 transition hover:bg-[#1a365d]/5 ${currentLetterId === lt.id ? 'bg-[#1a365d]/10 ring-1 ring-[#1a365d]/20' : ''}`}>
                      <button onClick={() => loadSavedLetter(lt)} className="flex-1 text-right min-w-0">
                        <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 truncate">
                          {lt.subject || lt.recipient || `خطاب #${lt.id}`}
                        </p>
                        <p className="text-[10px] text-brand-400">{new Date(lt.created_at).toLocaleDateString('ar-SA')}</p>
                      </button>
                      <button onClick={() => deleteLetter(lt.id)}
                        className="opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-600 p-0.5 shrink-0 mr-1">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Letter details */}
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-brand-700 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-brand-700 bg-[#1a365d]/5 dark:bg-[#1a365d]/20 flex items-center gap-2">
              <Tag size={15} className="text-[#1a365d] dark:text-[#c5a059]" />
              <span className="font-bold text-sm text-[#1a365d] dark:text-brand-100">بيانات الخطاب</span>
            </div>
            <div className="p-4 space-y-3">
              {field('الرقم المرجعي', <Hash size={13}/>,         data.reference, v => setData({...data, reference: v}), { placeholder: 'ص/1446/001' })}
              {field('التاريخ',        <CalendarDays size={13}/>, data.date,      v => setData({...data, date: v}),      { placeholder: '11/07/1447هـ' })}
              {field('المستلم',        <User size={13}/>,         data.recipient, v => setData({...data, recipient: v}), { placeholder: 'اللجنة التنفيذية' })}
              {field('الموضوع',        <AlignLeft size={13}/>,    data.subject,   v => setData({...data, subject: v}))}
            </div>
          </div>

          {/* Signature + stamp */}
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-brand-700 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-brand-700 bg-[#1a365d]/5 dark:bg-[#1a365d]/20">
              <span className="font-bold text-sm text-[#1a365d] dark:text-brand-100">التوقيع</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {field('اسم الموقّع', null, data.signName,  v => setData({...data, signName: v}))}
                {field('المنصب',      null, data.signTitle, v => setData({...data, signTitle: v}))}
              </div>

              {signature && (
                <div className="border border-slate-200 dark:border-brand-700 rounded-xl p-2 bg-slate-50 dark:bg-brand-800">
                  <p className="text-[10px] text-brand-400 mb-1">صورة التوقيع</p>
                  <img src={signature} alt="التوقيع" className="max-h-12 object-contain" />
                </div>
              )}

              {!signature && (
                <p className="text-[10px] text-brand-400 text-center py-1">
                  لم يُرفع توقيع — يمكن رفعه من{' '}
                  <a href="/profile" className="text-[#c5a059] underline">صفحة الملف الشخصي</a>
                </p>
              )}
            </div>

            {/* Stamp toggle */}
            {canUseStamp && (
              <div className="px-4 pb-4">
                <button onClick={() => setShowStamp(s => !s)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition text-sm font-bold ${
                    showStamp
                      ? 'bg-[#1a365d] border-[#1a365d] text-white'
                      : 'bg-slate-50 dark:bg-brand-800 border-slate-200 dark:border-brand-600 text-brand-600 dark:text-brand-300'}`}>
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

        {/* ── Main content: editor + preview ──────────────────── */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* TipTap editor card */}
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-brand-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-brand-700 bg-[#1a365d]/5 dark:bg-[#1a365d]/20 flex items-center gap-2">
              <PenLine size={15} className="text-[#1a365d] dark:text-[#c5a059]" />
              <span className="font-bold text-sm text-[#1a365d] dark:text-brand-100">نص الخطاب</span>
            </div>

            {/* Toolbar */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-brand-700 bg-slate-50 dark:bg-brand-950 flex flex-wrap gap-1 items-center" dir="ltr">
              <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="عريض">
                <Bold size={13} />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="مائل">
                <Italic size={13} />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="تحته خط">
                <UnderlineIcon size={13} />
              </ToolBtn>
              <div className="w-px h-5 bg-slate-200 dark:bg-brand-600 mx-0.5" />
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="عنوان">
                <Heading2 size={13} />
              </ToolBtn>
              <div className="w-px h-5 bg-slate-200 dark:bg-brand-600 mx-0.5" />
              <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="قائمة نقطية">
                <List size={13} />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="قائمة مرقمة">
                <ListOrdered size={13} />
              </ToolBtn>
              <div className="w-px h-5 bg-slate-200 dark:bg-brand-600 mx-0.5" />
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })} title="يمين">
                <AlignRight size={13} />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} title="وسط">
                <AlignCenter size={13} />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('justify').run()} active={editor?.isActive({ textAlign: 'justify' })} title="ضبط">
                <AlignJustify size={13} />
              </ToolBtn>
              <div className="w-px h-5 bg-slate-200 dark:bg-brand-600 mx-0.5" />
              <ToolBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="إدراج جدول">
                <Table2 size={13} />
              </ToolBtn>
              <ToolBtn onClick={insertImage} title="إدراج صورة">
                <ImageIcon size={13} />
              </ToolBtn>
            </div>

            {/* Editor area */}
            <div className="tiptap-editor border-0 rounded-none bg-white dark:bg-brand-900">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* A4 Preview */}
          <div className="bg-slate-200 dark:bg-slate-700 rounded-2xl p-4 xl:p-6 overflow-auto
                          flex justify-center items-start shadow-inner border border-slate-300 dark:border-slate-600">
            <div
              className="relative shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-slate-900/5 bg-white"
              style={{
                width: '210mm',
                minHeight: '297mm',
                backgroundImage: 'url(/brand/letterhead.png)',
                backgroundSize: '210mm 297mm',
                backgroundRepeat: 'repeat',
                backgroundPosition: 'top left',
              }}
            >
              {/* Metadata overlays — calibrated to value column (x=72-155mm) */}
              <div className="absolute" style={{ top: '20mm', left: '72mm', width: '83mm' }}>
                <span className="block text-right text-[10px] font-bold text-[#1a365d] leading-none">
                  {data.reference}
                </span>
              </div>
              <div className="absolute" style={{ top: '26.5mm', left: '72mm', width: '83mm' }}>
                <span className="block text-right text-[10px] font-bold text-[#1a365d] leading-none">
                  {data.date}
                </span>
              </div>
              <div className="absolute" style={{ top: '31mm', left: '72mm', width: '83mm' }}>
                <span className="block text-right text-[10px] font-bold text-[#1a365d] leading-none">
                  {data.subject}
                </span>
              </div>

              {/* Letter body — padding matches @page margins (38mm top, 18mm sides, 54mm bottom) */}
              <div style={{ padding: '38mm 18mm 54mm' }}>

                {/* Recipient */}
                <div className="mb-5">
                  <p className="text-[13.5px] font-semibold text-[#1a365d] leading-[1.8]">
                    السادة /{' '}
                    {data.recipient || <span className="text-slate-300 font-normal text-sm">اسم المستلم</span>}
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
                <div className="lp text-[13.5px] text-slate-800"
                  style={{ lineHeight: 2.3, textAlign: 'justify', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{
                    __html: data.body || '<p style="color:#cbd5e1;font-style:italic">ابدأ بكتابة نص الخطاب…</p>',
                  }}
                />

                {/* Signature + Stamp */}
                <div className="mt-12 flex items-end justify-between" style={{ direction: 'ltr', minHeight: '90px' }}>
                  {/* Left: stamp */}
                  <div className="flex flex-col items-start">
                    {canUseStamp && showStamp && (
                      <img src="/brand/stamp.png" alt="الختم" className="w-[160px] object-contain opacity-90" />
                    )}
                  </div>

                  {/* Right: signature */}
                  <div className="text-center min-w-[165px]" style={{ direction: 'rtl' }}>
                    {data.signTitle && (
                      <p className="text-[12px] font-bold text-[#1a365d] mb-1">{data.signTitle}</p>
                    )}
                    {signature && (
                      <img src={signature} alt="التوقيع" className="max-h-[50px] object-contain mx-auto mb-1" />
                    )}
                    {data.signName && (
                      <p className="text-[15px] font-black text-[#1a365d] pt-[6px] m-0"
                        style={{ borderTop: '1.5px solid #cbd5e1' }}>
                        {data.signName}
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
