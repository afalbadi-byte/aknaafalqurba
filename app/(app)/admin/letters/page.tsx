'use client'
import { useEffect, useRef, useState } from 'react'
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
  Save, Bold, Italic, UnderlineIcon, List, ListOrdered,
  AlignRight, AlignCenter, AlignJustify, Table2, ImageIcon, Heading2,
  X, FileText, Users as UsersIcon, Inbox, CheckCircle2, Clock, Eye,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   PAGE DIMENSIONS  (all in mm; matches CSS @page)
───────────────────────────────────────────────────────────── */
const PAGE = {
  W: 210, H: 297,
  TOP: 50,        // top safe zone — "السادة" sits well below the letterhead header
  BOTTOM: 42,     // bottom safe zone — page number sits above the footer banner
  SIDE: 18,       // side margins
  PAGE_NUM: 6,    // page-number row height
  SIG: 34,        // signature+stamp row height
  INTRO: 30,      // recipient + subject heading on page 1
}
const PX_PER_MM = 3.7795

/* ─────────────────────────────────────────────────────────────
   CSS — shared between preview and print
───────────────────────────────────────────────────────────── */
const PAGE_CSS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 0; font-family: 'Cairo', sans-serif; direction: rtl; background: #e5e7eb; }

  @page { size: A4 portrait; margin: 0; }
  @media print {
    body { background: none; }
    .a4-page { margin: 0 !important; box-shadow: none !important; page-break-after: always; }
    .a4-page:last-child { page-break-after: auto; }
  }

  .a4-page {
    width: 210mm;
    height: 297mm;
    position: relative;
    background: url(BG_URL) top left / 210mm 297mm no-repeat #fff;
    margin: 0 auto 18px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.18);
    overflow: hidden;
  }

  /* Metadata overlays — LEFT of label colons; REPEAT on EVERY page */
  /* Values sit over the kashida (ـــ) inside the label row, so they */
  /* need a solid background to stand out from the kashida stroke.   */
  .mv {
    position: absolute; direction: rtl; text-align: right;
    color: #1a365d; font-weight: 700; font-size: 11px;
    left: 6mm; width: 48mm;
    z-index: 10;
    background: rgba(255,255,255,0.94);
    padding: 0.5mm 1.5mm;
    border-radius: 1mm;
    line-height: 1;
  }
  .mv-ref  { top: 17.6mm; }
  .mv-date { top: 23.2mm; }
  .mv-subj { top: 28.8mm; }

  /* Content area — inside top/bottom safe zones */
  .page-content {
    position: absolute;
    top: ${PAGE.TOP}mm; left: ${PAGE.SIDE}mm; right: ${PAGE.SIDE}mm;
    bottom: ${PAGE.BOTTOM}mm;
  }

  /* Recipient + subject heading — only page 1 */
  .recipient p { font-size: 13.5px; color: #1a365d; font-weight: 600; line-height: 1.8; margin: 0 0 3px; }
  .recipient .hon { color: #475569; font-weight: 500; }
  .recipient { margin-bottom: 14px; }

  .subject-heading {
    font-size: 14px; font-weight: 900; color: #1a365d;
    text-align: center;
    border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;
    padding: 6px 0; margin: 0 0 14px;
  }

  /* Body content */
  .body-text {
    text-align: justify; line-height: 2.3;
    color: #1e293b; font-size: 13.5px; word-wrap: break-word;
  }
  .body-text p { margin: 0 0 10px; }
  .body-text li { margin-bottom: 5px; }
  .body-text ol, .body-text ul { padding-right: 1.4em; }
  .body-text h2 { font-size: 15px; font-weight: 900; color: #1a365d; margin: 12px 0 8px; }
  .body-text h3 { font-size: 14px; font-weight: 700; color: #1a365d; margin: 10px 0 6px; }
  .body-text table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
  .body-text th, .body-text td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; }
  .body-text th { background: #f1f5f9; font-weight: 700; color: #1a365d; }
  .body-text img { max-width: 100%; height: auto; }

  /* Signature row — fixed at bottom of LAST page only */
  .sign-row {
    position: absolute;
    bottom: ${PAGE.BOTTOM + PAGE.PAGE_NUM + 4}mm;
    left: ${PAGE.SIDE}mm; right: ${PAGE.SIDE}mm;
    display: flex; justify-content: space-between; align-items: flex-end;
    direction: ltr; min-height: ${PAGE.SIG}mm;
  }
  .stamp-img  { width: 320px; object-fit: contain; opacity: 0.92; }
  .sign-block { text-align: center; min-width: 175px; direction: rtl; }
  .sig-img    { display: block; max-height: 50px; max-width: 160px; object-fit: contain; margin: 0 auto 2px; }
  .sign-title { font-weight: 700; color: #1a365d; font-size: 12px; margin: 0 0 4px; }
  .sign-name  {
    font-weight: 900; font-size: 15px; color: #1a365d;
    border-top: 1.5px solid #cbd5e1; padding-top: 6px; margin: 0;
  }

  /* Page number — centered INSIDE the footer banner (middle empty area) */
  .page-num {
    position: absolute;
    bottom: 13mm;
    left: 0; right: 0;
    text-align: center;
    font-size: 9.5px; font-weight: 700;
    color: #1a365d; letter-spacing: 0.5px;
    z-index: 5;
  }

  /* Empty content placeholder */
  .body-text:empty::before {
    content: " "; display: block; height: 1px;
  }
`

/* ─────────────────────────────────────────────────────────────
   PAGINATOR — splits bodyHTML into chunks that fit A4 pages
───────────────────────────────────────────────────────────── */
function paginate(bodyHTML: string, hasIntro: boolean): string[] {
  if (typeof window === 'undefined') return [bodyHTML || ' ']
  const clean = (bodyHTML || '').trim()
  if (!clean) return [' ']

  const SAFE_H_MM = PAGE.H - PAGE.TOP - PAGE.BOTTOM           // 223mm
  const FULL_BODY_MM = SAFE_H_MM - PAGE.PAGE_NUM              // 217mm
  const introMM = hasIntro ? PAGE.INTRO : 0

  // Hidden measure container (same width + styles as render)
  const measure = document.createElement('div')
  measure.style.cssText = `
    position: fixed; top: -10000px; left: 0;
    width: ${PAGE.W - 2 * PAGE.SIDE}mm; visibility: hidden;
    font-family: 'Cairo', sans-serif;
    font-size: 13.5px; line-height: 2.3;
    text-align: justify; direction: rtl;
    word-wrap: break-word; word-break: break-word;
  `
  measure.className = 'body-text'
  measure.innerHTML = clean
  document.body.appendChild(measure)

  try {
    const totalMM = measure.offsetHeight / PX_PER_MM

    // Single page: intro + body + signature all fit
    if (introMM + totalMM + PAGE.SIG <= FULL_BODY_MM) {
      return [clean]
    }

    // Multi-page walk
    const children = Array.from(measure.children) as HTMLElement[]
    if (children.length === 0) return [clean]

    const pages: HTMLElement[][] = [[]]
    let curMM = introMM // page 1 reserves intro space

    for (const child of children) {
      const cMM = child.offsetHeight / PX_PER_MM

      if (curMM + cMM > FULL_BODY_MM && pages[pages.length - 1].length > 0) {
        pages.push([])
        curMM = 0
      }
      pages[pages.length - 1].push(child)
      curMM += cMM
    }

    // Make sure the LAST page has room for the signature row.
    // If not, push an empty page so signature gets its own page.
    let lastMM = 0
    for (const el of pages[pages.length - 1]) lastMM += el.offsetHeight / PX_PER_MM
    if (pages.length === 1) lastMM += introMM

    if (lastMM + PAGE.SIG > FULL_BODY_MM) {
      pages.push([])
    }

    return pages.map(p => p.map(el => el.outerHTML).join('') || ' ')
  } finally {
    document.body.removeChild(measure)
  }
}

/* ─────────────────────────────────────────────────────────────
   Build a single page's inner HTML (used by print + preview share)
───────────────────────────────────────────────────────────── */
function pageHTML(opts: {
  bodyChunk: string
  pageIndex: number
  totalPages: number
  data: LetterForm
  showStamp: boolean
  signature?: string | null
}) {
  const { bodyChunk, pageIndex, totalPages, data, showStamp, signature } = opts
  const isFirst = pageIndex === 0
  const isLast  = pageIndex === totalPages - 1

  // Header values (الرقم/التاريخ/الموضوع) repeat on EVERY page
  const overlays = `
    ${data.reference ? `<span class="mv mv-ref">${escapeHTML(data.reference)}</span>`   : ''}
    ${data.date      ? `<span class="mv mv-date">${escapeHTML(data.date)}</span>`       : ''}
    ${data.subject   ? `<span class="mv mv-subj">${escapeHTML(data.subject)}</span>`    : ''}
  `

  const intro = isFirst ? `
    <div class="recipient">
      <p>السادة / ${escapeHTML(data.recipient) || ''}</p>
      <p class="hon">حفظهم الله،،</p>
    </div>
    ${data.subject ? `<div class="subject-heading">الموضوع: ${escapeHTML(data.subject)}</div>` : ''}
  ` : ''

  const sig = isLast ? `
    <div class="sign-row">
      <div>${showStamp ? `<img class="stamp-img" src="STAMP_URL" alt="" onerror="this.style.display='none'">` : ''}</div>
      <div class="sign-block">
        ${data.signTitle ? `<p class="sign-title">${escapeHTML(data.signTitle)}</p>` : ''}
        ${signature ? `<img class="sig-img" src="${signature}" alt="">` : ''}
        ${data.signName ? `<p class="sign-name">${escapeHTML(data.signName)}</p>` : ''}
      </div>
    </div>
  ` : ''

  const pageNum = totalPages > 1
    ? `<div class="page-num">صفحة ${pageIndex + 1} من ${totalPages}</div>`
    : `<div class="page-num">&nbsp;</div>`

  return `
    <div class="a4-page">
      ${overlays}
      <div class="page-content">
        ${intro}
        <div class="body-text">${bodyChunk}</div>
      </div>
      ${sig}
      ${pageNum}
    </div>
  `
}

function escapeHTML(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ─────────────────────────────────────────────────────────────
   Build the full print document
───────────────────────────────────────────────────────────── */
function buildPrintHTML(
  data: LetterForm,
  pages: string[],
  origin: string,
  showStamp: boolean,
  signature: string | null,
) {
  const bg     = `${origin}/brand/letterhead.png`
  const stamp  = `${origin}/brand/stamp.png`
  const hasIntro = true
  const css    = PAGE_CSS.replace(/BG_URL/g, bg)
  const pagesHtml = pages.map((chunk, i) =>
    pageHTML({
      bodyChunk: chunk, pageIndex: i, totalPages: pages.length,
      data, showStamp, signature,
    }).replace(/STAMP_URL/g, stamp)
  ).join('')

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head>
<meta charset="utf-8">
<title>خطاب — ${escapeHTML(data.recipient) || 'الصندوق'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>${css}</style>
</head><body>
${pagesHtml}
</body></html>`
}

/**
 * Generate the letter as a PDF directly in the browser using
 * html2canvas + jsPDF. Bypasses the OS print dialog so output is
 * identical on desktop AND mobile — the OS print dialog is unreliable
 * on iOS Safari and varies across Android browsers.
 *
 * Each .a4-page is captured separately at 210×297 mm so we get crisp
 * page dimensions regardless of host viewport.
 */
async function generateLetterPDF(html: string, filename: string) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  // Render off-screen so styles + fonts + bg image are isolated
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:300mm;border:0;'
  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentDocument!
    doc.open(); doc.write(html); doc.close()

    // Wait for fonts AND every image (letterhead, signature, stamp)
    await new Promise<void>(resolve => {
      const ready = async () => {
        const fonts = (doc as any).fonts
        if (fonts?.ready) try { await fonts.ready } catch {}
        const imgs = Array.from(doc.images) as HTMLImageElement[]
        await Promise.all(imgs.map(img =>
          img.complete && img.naturalHeight > 0
            ? Promise.resolve()
            : new Promise(r => { img.onload = img.onerror = () => r(null) })
        ))
        setTimeout(resolve, 300)
      }
      if (doc.readyState === 'complete') ready()
      else iframe.addEventListener('load', ready, { once: true })
    })

    const pages = Array.from(doc.querySelectorAll('.a4-page')) as HTMLElement[]
    if (pages.length === 0) throw new Error('لا توجد صفحات للتصدير')

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage()
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: pages[i].offsetWidth,
        windowHeight: pages[i].offsetHeight,
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
    }
    pdf.save(filename)
  } finally {
    document.body.removeChild(iframe)
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
const ROLE_LABELS_SHORT: Record<string, string> = {
  admin: 'مدير النظام', president: 'رئيس الصندوق', secretary: 'أمين السر',
  treasurer: 'المدير المالي', aid_committee: 'لجنة الدعم',
}
function canUseStampFor(u: any): boolean {
  if (!u) return false
  if (u.role === 'admin' || u.role === 'president') return true
  return Array.isArray(u.permissions) && u.permissions.includes('letter.stamp')
}

function ToolBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition
        ${active
          ? 'bg-[#1a365d] text-white'
          : 'hover:bg-slate-100 dark:hover:bg-brand-700 text-brand-600 dark:text-brand-300'}`}>
      {children}
    </button>
  )
}

/* ─── Component ─────────────────────────────────────────────── */
export default function LetterGenerator() {
  const [user,         setUser]         = useState<any>(null)
  const [templates,    setTemplates]    = useState<any[]>([])
  const [savedLetters, setSavedLetters] = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showStamp,    setShowStamp]    = useState(false)

  const [data, setData] = useState<LetterForm>({
    reference: '', date: '', recipient: '', subject: '',
    body: '', signName: '', signTitle: '',
  })

  /* paginated body chunks */
  const [pages, setPages] = useState<string[]>([' '])

  const [showSave,  setShowSave]  = useState(false)
  const [saveMeta,  setSaveMeta]  = useState({ category: 'إدارية عامة', title: '' })
  const [saving,    setSaving]    = useState(false)
  const [seeding,   setSeeding]   = useState(false)
  const [catOpen,   setCatOpen]   = useState<string | null>(null)

  const [showLetterSave, setShowLetterSave]   = useState(false)
  const [savingLetter,   setSavingLetter]     = useState(false)
  const [currentLetterId, setCurrentLetterId] = useState<number | null>(null)

  /* Recipients + incoming */
  const [staff,         setStaff]         = useState<any[]>([])
  const [recipientIds,  setRecipientIds]  = useState<number[]>([])
  const [showRecipPicker, setShowRecipPicker] = useState(false)
  const [incoming,      setIncoming]      = useState<any[]>([])
  const [letterBox,     setLetterBox]     = useState<'templates' | 'saved' | 'incoming'>('templates')

  /* Approval modal */
  const [reviewingLetter, setReviewingLetter] = useState<any>(null)
  const [reviewLoading,   setReviewLoading]   = useState(false)
  const [reviewUseStamp,  setReviewUseStamp]  = useState(false)
  const [reviewNotes,     setReviewNotes]     = useState('')
  const [approving,       setApproving]       = useState(false)

  const canUseStamp = canUseStampFor(user)
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
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'min-h-[180px] outline-none text-[13.5px] leading-[2] text-brand-900 dark:text-brand-50',
        dir: 'rtl',
      },
    },
    onUpdate: ({ editor }) => setData(d => ({ ...d, body: editor.getHTML() })),
  })

  /* ── Re-paginate when content changes (debounced) ── */
  useEffect(() => {
    const t = setTimeout(() => {
      const newPages = paginate(data.body, true)
      setPages(newPages)
    }, 250)
    return () => clearTimeout(t)
  }, [data.body, data.recipient, data.subject])

  /* ── Bootstrap ── */
  useEffect(() => {
    Promise.all([
      api.auth.me().catch(() => null),
      api.letterTemplates.list().catch(() => ({ templates: [] })),
      api.letters.list('outgoing').catch(() => ({ letters: [] })),
      api.letters.list('incoming').catch(() => ({ letters: [] })),
      api.members.staff().catch(() => ({ staff: [] })),
    ]).then(([me, t, out, inc, st]) => {
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
      setSavedLetters(out?.letters || [])
      setIncoming(inc?.letters || [])
      setStaff((st?.staff || []).filter((s: any) => s.id !== me?.user?.id))
    }).finally(() => setLoading(false))
  }, [])

  function toggleRecipient(id: number) {
    setRecipientIds(rs => rs.includes(id) ? rs.filter(x => x !== id) : [...rs, id])
  }
  function selectAllRecipients() { setRecipientIds(staff.map(s => s.id)) }
  function clearRecipients()     { setRecipientIds([]) }

  async function openIncoming(lt: any) {
    setReviewLoading(true)
    setReviewingLetter({ id: lt.id })  // open modal immediately
    setReviewUseStamp(false); setReviewNotes('')
    try {
      const r = await api.letters.get(lt.id)
      setReviewingLetter(r)
      // refresh incoming list (status may flip to viewed)
      const inc = await api.letters.list('incoming')
      setIncoming(inc.letters || [])
    } catch (e: any) {
      alert(e.message || 'فشل التحميل')
      setReviewingLetter(null)
    } finally { setReviewLoading(false) }
  }

  async function approveLetter() {
    if (!reviewingLetter?.letter) return
    setApproving(true)
    try {
      await api.letters.approve(reviewingLetter.letter.id, {
        signature:  signature || null,
        use_stamp:  canUseStamp && reviewUseStamp,
        notes:      reviewNotes.trim() || null,
      })
      const inc = await api.letters.list('incoming')
      setIncoming(inc.letters || [])
      setReviewingLetter(null)
    } catch (e: any) {
      alert(e.message || 'فشل الاعتماد')
    } finally { setApproving(false) }
  }

  const grouped = templates.reduce<Record<string, any[]>>((acc, t) => {
    ;(acc[t.category] ||= []).push(t); return acc
  }, {})

  function loadTemplate(tpl: any) {
    editor?.commands.setContent(tpl.body)
    setData(d => ({ ...d, subject: tpl.subject, body: tpl.body }))
    setSaveMeta({ category: tpl.category, title: tpl.title + ' — معدّل' })
  }

  function loadSavedLetter(lt: any) {
    setData({
      reference: lt.reference || '', date: lt.date || '',
      recipient: lt.recipient || '', subject: lt.subject || '',
      body: lt.body || '', signName: lt.sign_name || '',
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
        drafter_signature: signature || null,
        recipient_ids: recipientIds,
      }
      if (currentLetterId) await api.letters.update(currentLetterId, payload)
      else { const r = await api.letters.create(payload); setCurrentLetterId(r.letter.id) }
      const lts = await api.letters.list('outgoing')
      setSavedLetters(lts.letters || [])
      setShowLetterSave(false)
    } finally { setSavingLetter(false) }
  }

  async function deleteLetter(id: number) {
    if (!confirm('حذف هذا الخطاب نهائياً؟')) return
    await api.letters.remove(id)
    setSavedLetters(lts => lts.filter(l => l.id !== id))
    if (currentLetterId === id) setCurrentLetterId(null)
  }

  function loadOutgoingLetter(lt: any) {
    // Same as loadSavedLetter but explicit (for outgoing tab)
    loadSavedLetter(lt)
  }

  async function seedTemplates() {
    setSeeding(true)
    try {
      await api.letterTemplates.seed()
      const r = await api.letterTemplates.list()
      setTemplates(r.templates || [])
    } finally { setSeeding(false) }
  }

  const [exporting, setExporting] = useState(false)

  async function handleExportPDF() {
    if (exporting) return
    setExporting(true)
    try {
      const html = buildPrintHTML(
        data, pages, window.location.origin,
        canUseStamp ? showStamp : false, signature,
      )
      const safeSubject = (data.subject || data.recipient || 'خطاب').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80)
      await generateLetterPDF(html, `${safeSubject}.pdf`)
    } catch (e: any) {
      alert(e?.message || 'تعذّر إنشاء ملف الـ PDF')
    } finally {
      setExporting(false)
    }
  }

  function insertImage() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return
      const reader = new FileReader()
      reader.onload = e => { const src = e.target?.result as string; editor?.chain().focus().setImage({ src }).run() }
      reader.readAsDataURL(file)
    }
    input.click()
  }

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

  // Inject the shared page CSS into the document head (for preview only)
  const previewCSS = PAGE_CSS.replace(/BG_URL/g, '/brand/letterhead.png')

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
        .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-right: 1.4rem; }
        .tiptap-editor .ProseMirror h2 { font-size: 16px; font-weight: 900; color: #1a365d; margin: 12px 0 6px; }
        .tiptap-editor .ProseMirror h3 { font-size: 14px; font-weight: 700; color: #1a365d; margin: 10px 0 5px; }

        /* A4 preview pages (injected from PAGE_CSS) */
        ${previewCSS}
      `}</style>

      {/* Page title */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-[#1a365d] flex items-center justify-center shrink-0">
          <FilePen size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-brand-950 dark:text-brand-50">منشئ الخطابات الرسمية</h1>
          <p className="text-xs text-brand-500 dark:text-brand-400">
            صندوق أكناف القربى — عائلة البادي{pages.length > 1 && ` • ${pages.length} صفحات`}
          </p>
        </div>
        <div className="mr-auto flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowLetterSave(true)}
            className="flex items-center gap-1.5 bg-[#c5a059] hover:bg-[#b8944f] text-white
                       px-4 py-2.5 rounded-2xl font-bold text-sm transition shadow">
            <Save size={15} /> حفظ الخطاب
          </button>
          <button onClick={handleExportPDF} disabled={exporting}
            className="flex items-center gap-2 bg-[#1a365d] hover:bg-[#c5a059] text-white
                       px-5 py-2.5 rounded-2xl font-bold text-sm transition shadow-lg hover:-translate-y-0.5 transform
                       disabled:opacity-60 disabled:cursor-wait">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {exporting ? 'جاري الإنشاء…' : 'تصدير PDF'}
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
            <p className="text-sm text-brand-500 dark:text-brand-400 mb-3">
              {currentLetterId ? 'سيتم تحديث الخطاب المحفوظ.' : 'سيحفظ الخطاب مع كل بياناته لاسترجاعه لاحقاً.'}
            </p>
            {recipientIds.length > 0 && (
              <div className="bg-[#1a365d]/5 dark:bg-[#1a365d]/20 text-[#1a365d] dark:text-brand-100 text-xs rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                <UsersIcon size={13} />
                سيُرسل للاطلاع إلى {recipientIds.length} موظف{recipientIds.length > 2 ? 'اً' : ''}.
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={saveLetter} disabled={savingLetter}
                className="flex-1 bg-[#1a365d] hover:bg-[#c5a059] text-white py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
                {savingLetter ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {currentLetterId ? 'تحديث' : 'حفظ وإرسال'}
              </button>
              <button onClick={() => setShowLetterSave(false)}
                className="px-4 bg-slate-100 dark:bg-brand-800 text-brand-600 dark:text-brand-300 py-2.5 rounded-xl font-bold text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming letter review + approval modal */}
      {reviewingLetter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-brand-700 flex items-center justify-between">
              <h2 className="font-black text-[#1a365d] dark:text-brand-50 text-lg flex items-center gap-2">
                <Inbox size={18} />
                {reviewingLetter.letter?.subject || 'خطاب وارد'}
              </h2>
              <button onClick={() => setReviewingLetter(null)} className="text-brand-400 hover:text-brand-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {reviewLoading || !reviewingLetter.letter ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-[#c5a059]" size={32} />
                </div>
              ) : (
                <>
                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-50 dark:bg-brand-800 rounded-xl p-3">
                      <p className="text-[10px] text-brand-400 mb-0.5">من المحرر</p>
                      <p className="font-semibold text-brand-900 dark:text-brand-100">{reviewingLetter.letter.created_by_name}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-brand-800 rounded-xl p-3">
                      <p className="text-[10px] text-brand-400 mb-0.5">التاريخ</p>
                      <p className="font-semibold text-brand-900 dark:text-brand-100">{reviewingLetter.letter.date || new Date(reviewingLetter.letter.created_at).toLocaleDateString('ar-SA')}</p>
                    </div>
                    {reviewingLetter.letter.reference && (
                      <div className="bg-slate-50 dark:bg-brand-800 rounded-xl p-3 col-span-2">
                        <p className="text-[10px] text-brand-400 mb-0.5">الرقم المرجعي</p>
                        <p className="font-semibold text-brand-900 dark:text-brand-100 font-mono text-xs">{reviewingLetter.letter.reference}</p>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="border border-slate-200 dark:border-brand-700 rounded-xl p-4 bg-white dark:bg-brand-950">
                    {reviewingLetter.letter.recipient && (
                      <p className="text-sm text-[#1a365d] dark:text-brand-200 font-bold mb-3">السادة / {reviewingLetter.letter.recipient}</p>
                    )}
                    <div className="lp text-[13.5px] text-slate-800 dark:text-slate-200"
                      style={{ lineHeight: 2.2, textAlign: 'justify' }}
                      dangerouslySetInnerHTML={{ __html: reviewingLetter.letter.body || '' }} />

                    {/* Drafter signature/stamp snapshot */}
                    {(reviewingLetter.letter.drafter_signature || reviewingLetter.letter.drafter_used_stamp) && (
                      <div className="mt-6 pt-4 border-t border-dashed border-slate-200 dark:border-brand-700 flex items-end justify-between" dir="ltr">
                        <div>
                          {reviewingLetter.letter.drafter_used_stamp && (
                            <img src="/brand/stamp.png" alt="" className="w-[120px] opacity-90" />
                          )}
                        </div>
                        <div className="text-center" dir="rtl">
                          {reviewingLetter.letter.sign_title && (
                            <p className="text-[11px] font-bold text-[#1a365d] dark:text-brand-200">{reviewingLetter.letter.sign_title}</p>
                          )}
                          {reviewingLetter.letter.drafter_signature && (
                            <img src={reviewingLetter.letter.drafter_signature} alt="" className="max-h-12 mx-auto" />
                          )}
                          <p className="text-sm font-black text-[#1a365d] dark:text-brand-100 border-t border-slate-300 dark:border-brand-600 pt-1 mt-1">
                            {reviewingLetter.letter.sign_name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Other recipients' status */}
                  {reviewingLetter.recipients?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-2">المعتمدون والمستلمون</h3>
                      <div className="space-y-1.5">
                        {reviewingLetter.recipients.map((r: any) => (
                          <div key={r.id} className="flex items-center gap-2 bg-slate-50 dark:bg-brand-800 rounded-lg px-3 py-1.5 text-xs">
                            <span className={r.status === 'approved' ? 'text-emerald-500' : r.status === 'viewed' ? 'text-amber-500' : 'text-brand-400'}>
                              {r.status === 'approved' ? <CheckCircle2 size={13} />
                                : r.status === 'viewed' ? <Eye size={13} />
                                : <Clock size={13} />}
                            </span>
                            <span className="flex-1 font-semibold text-brand-800 dark:text-brand-200">{r.full_name}</span>
                            <span className="text-[10px] text-brand-400">{ROLE_LABELS_SHORT[r.role] || r.role}</span>
                            {r.used_stamp && <span title="ختم رسمي"><Stamp size={11} className="text-[#c5a059]" /></span>}
                            {r.approved_at && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                {new Date(r.approved_at).toLocaleDateString('ar-SA')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approval section (only if I'm a recipient and not yet approved) */}
                  {reviewingLetter.my_recipient && reviewingLetter.my_recipient.status !== 'approved' && (
                    <div className="border-2 border-[#c5a059]/30 rounded-2xl p-4 bg-[#c5a059]/5">
                      <h3 className="font-bold text-[#1a365d] dark:text-brand-100 text-sm mb-3 flex items-center gap-2">
                        <CheckCircle2 size={16} /> اعتماد الخطاب
                      </h3>

                      {!signature && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-lg px-3 py-2 mb-3">
                          ⚠ لم تسجّل توقيعك بعد. اذهب لـ <a href="/profile" className="font-bold underline">صفحة بياناتك</a> أولاً.
                        </p>
                      )}

                      {signature && (
                        <div className="bg-white dark:bg-brand-900 rounded-xl p-2 border border-slate-200 dark:border-brand-700 flex items-center justify-center mb-3">
                          <img src={signature} alt="" className="max-h-12 object-contain" />
                        </div>
                      )}

                      {canUseStamp && (
                        <label className="flex items-center gap-2 cursor-pointer mb-3 text-sm font-semibold text-brand-800 dark:text-brand-200">
                          <input type="checkbox" checked={reviewUseStamp}
                            onChange={e => setReviewUseStamp(e.target.checked)}
                            className="accent-[#1a365d] w-4 h-4" />
                          <Stamp size={14} className="text-[#c5a059]" />
                          أضف الختم الرسمي مع التوقيع
                        </label>
                      )}

                      <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                        placeholder="ملاحظات (اختياري)"
                        className="w-full border border-slate-200 dark:border-brand-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-brand-900 mb-3 resize-none"
                        rows={2} />

                      <div className="flex gap-2">
                        <button onClick={approveLetter} disabled={approving || !signature}
                          className="flex-1 bg-[#1a365d] hover:bg-[#c5a059] disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                          {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          اعتماد بتوقيعي
                        </button>
                        <button onClick={() => setReviewingLetter(null)}
                          className="px-5 bg-slate-100 dark:bg-brand-800 text-brand-600 dark:text-brand-300 py-2.5 rounded-xl font-bold text-sm">
                          إغلاق
                        </button>
                      </div>
                    </div>
                  )}

                  {reviewingLetter.my_recipient?.status === 'approved' && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      اعتمدتَ هذا الخطاب في {new Date(reviewingLetter.my_recipient.approved_at).toLocaleString('ar-SA')}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div className="w-full xl:w-[340px] shrink-0 space-y-4">

          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-brand-700 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 dark:border-brand-700">
              {([
                { v: 'templates' as const, l: <><BookOpen size={13} /> النماذج</> },
                { v: 'saved'     as const, l: <><FileText size={13} /> المحفوظة ({savedLetters.length})</> },
                { v: 'incoming'  as const, l: <><Inbox size={13} /> الواردة ({incoming.length})</> },
              ]).map(t => (
                <button key={t.v} onClick={() => setLetterBox(t.v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-xs font-bold transition ${
                    letterBox === t.v
                      ? 'bg-[#1a365d] text-white'
                      : 'text-brand-500 dark:text-brand-400 hover:bg-slate-50 dark:hover:bg-brand-800'}`}>
                  {t.l}
                </button>
              ))}
            </div>

            <div className="p-4">
              {letterBox === 'templates' && (
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

              {letterBox === 'saved' && (
                <div className="space-y-1.5">
                  {savedLetters.length === 0 ? (
                    <p className="text-center text-xs text-brand-400 py-3">لا توجد خطابات محفوظة بعد</p>
                  ) : savedLetters.map(lt => (
                    <div key={lt.id} className={`flex items-center justify-between group rounded-lg px-2 py-1.5 transition hover:bg-[#1a365d]/5 ${currentLetterId === lt.id ? 'bg-[#1a365d]/10 ring-1 ring-[#1a365d]/20' : ''}`}>
                      <button onClick={() => loadSavedLetter(lt)} className="flex-1 text-right min-w-0">
                        <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 truncate">
                          {lt.subject || lt.recipient || `خطاب #${lt.id}`}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-brand-400">
                          <span>{new Date(lt.created_at).toLocaleDateString('ar-SA')}</span>
                          {lt.recipients_count > 0 && (
                            <span className="flex items-center gap-0.5">
                              <UsersIcon size={9} /> {lt.approved_count}/{lt.recipients_count}
                            </span>
                          )}
                        </div>
                      </button>
                      <button onClick={() => deleteLetter(lt.id)}
                        className="opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-600 p-0.5 shrink-0 mr-1">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {letterBox === 'incoming' && (
                <div className="space-y-1.5">
                  {incoming.length === 0 ? (
                    <p className="text-center text-xs text-brand-400 py-3">لا توجد خطابات واردة للاطلاع</p>
                  ) : incoming.map(lt => {
                    const isPending  = lt.my_status === 'pending'
                    const isViewed   = lt.my_status === 'viewed'
                    const isApproved = lt.my_status === 'approved'
                    return (
                      <button key={lt.id} onClick={() => openIncoming(lt)}
                        className="w-full text-right flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-[#1a365d]/5">
                        <span className={`shrink-0 ${
                          isApproved ? 'text-emerald-500'
                          : isViewed  ? 'text-amber-500'
                          : 'text-red-500 animate-pulse'
                        }`}>
                          {isApproved ? <CheckCircle2 size={14} />
                            : isViewed ? <Eye size={14} />
                            : <Clock size={14} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 truncate">
                            {lt.subject || `خطاب #${lt.id}`}
                          </p>
                          <p className="text-[10px] text-brand-400 truncate">
                            من {lt.created_by_name} · {new Date(lt.created_at).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                      </button>
                    )
                  })}
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

          {/* Recipients (staff) — receive the letter for review + approval */}
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-brand-700 shadow-sm">
            <button onClick={() => setShowRecipPicker(o => !o)}
              className="w-full px-4 py-3 border-b border-slate-100 dark:border-brand-700 bg-[#1a365d]/5 dark:bg-[#1a365d]/20 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UsersIcon size={15} className="text-[#1a365d] dark:text-[#c5a059]" />
                <span className="font-bold text-sm text-[#1a365d] dark:text-brand-100">المستلمون للاطلاع</span>
                {recipientIds.length > 0 && (
                  <span className="bg-[#c5a059] text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                    {recipientIds.length}
                  </span>
                )}
              </span>
              <ChevronDown size={14} className={`text-brand-400 transition-transform ${showRecipPicker ? 'rotate-180' : ''}`} />
            </button>

            {showRecipPicker && (
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button onClick={selectAllRecipients} type="button"
                    className="text-xs font-bold text-[#1a365d] dark:text-[#c5a059] hover:underline">
                    اختيار الجميع
                  </button>
                  {recipientIds.length > 0 && (
                    <button onClick={clearRecipients} type="button"
                      className="text-xs text-red-500 hover:underline">
                      إلغاء التحديد
                    </button>
                  )}
                </div>

                {staff.length === 0 ? (
                  <p className="text-xs text-brand-400 text-center py-2">لا يوجد موظفون نشطون</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto -mx-1 px-1 space-y-1">
                    {staff.map(s => {
                      const checked = recipientIds.includes(s.id)
                      return (
                        <label key={s.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition ${
                            checked
                              ? 'bg-[#1a365d]/10 dark:bg-[#1a365d]/30'
                              : 'hover:bg-slate-50 dark:hover:bg-brand-800'}`}>
                          <input type="checkbox" checked={checked}
                            onChange={() => toggleRecipient(s.id)}
                            className="accent-[#1a365d] w-4 h-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-brand-800 dark:text-brand-200 truncate">{s.full_name}</p>
                            <p className="text-[10px] text-brand-400">{ROLE_LABELS_SHORT[s.role] || s.role}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}

                <p className="text-[10px] text-brand-400 leading-relaxed">
                  المستلمون سيُشعَرون ويظهر لديهم الخطاب في تبويب "الواردة" للاطلاع
                  والاعتماد بتوقيعهم الخاص.
                </p>
              </div>
            )}
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
                  <img src={signature} alt="" className="max-h-12 object-contain" />
                </div>
              )}

              {!signature && (
                <p className="text-[10px] text-brand-400 text-center py-1">
                  لم يُرفع توقيع — يمكن رفعه من{' '}
                  <a href="/profile" className="text-[#c5a059] underline">صفحة الملف الشخصي</a>
                </p>
              )}
            </div>

            <div className="px-4 pb-4">
              {canUseStamp ? (
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
              ) : (
                <div className="text-[10px] text-brand-400 dark:text-brand-500 bg-slate-50 dark:bg-brand-800 border border-slate-200 dark:border-brand-700 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Stamp size={13} />
                  استخدام الختم يتطلب صلاحية "letter.stamp" — يمنحها الإدارة.
                </div>
              )}
            </div>

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

            <div className="px-3 py-2 border-b border-slate-100 dark:border-brand-700 bg-slate-50 dark:bg-brand-950 flex flex-wrap gap-1 items-center" dir="ltr">
              <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="عريض"><Bold size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="مائل"><Italic size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="تحته خط"><UnderlineIcon size={13} /></ToolBtn>
              <div className="w-px h-5 bg-slate-200 dark:bg-brand-600 mx-0.5" />
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="عنوان"><Heading2 size={13} /></ToolBtn>
              <div className="w-px h-5 bg-slate-200 dark:bg-brand-600 mx-0.5" />
              <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="قائمة نقطية"><List size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="قائمة مرقمة"><ListOrdered size={13} /></ToolBtn>
              <div className="w-px h-5 bg-slate-200 dark:bg-brand-600 mx-0.5" />
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })} title="يمين"><AlignRight size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} title="وسط"><AlignCenter size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('justify').run()} active={editor?.isActive({ textAlign: 'justify' })} title="ضبط"><AlignJustify size={13} /></ToolBtn>
              <div className="w-px h-5 bg-slate-200 dark:bg-brand-600 mx-0.5" />
              <ToolBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="إدراج جدول"><Table2 size={13} /></ToolBtn>
              <ToolBtn onClick={insertImage} title="إدراج صورة"><ImageIcon size={13} /></ToolBtn>
            </div>

            <div className="tiptap-editor border-0 rounded-none bg-white dark:bg-brand-900">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Multi-page A4 preview */}
          <div className="bg-slate-300 dark:bg-slate-800 rounded-2xl p-4 xl:p-6 overflow-auto
                          flex justify-center items-start shadow-inner border border-slate-300 dark:border-slate-600
                          min-h-[600px]">
            <div className="flex flex-col items-center">
              {pages.map((chunk, i) => {
                const html = pageHTML({
                  bodyChunk: chunk, pageIndex: i, totalPages: pages.length,
                  data, showStamp: canUseStamp ? showStamp : false, signature,
                }).replace(/STAMP_URL/g, '/brand/stamp.png')
                return (
                  <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
