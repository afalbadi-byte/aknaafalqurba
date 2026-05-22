'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import {
  Shield, Phone, Mail, Hash, CalendarDays, BookOpen, Users,
  HandHeart, TrendingUp, Download, ChevronDown, ChevronUp,
  Award, Heart, Scale, Eye,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────── */
function isPdf(src?: string) {
  return !!(src && (src.startsWith('data:application/pdf') || src.startsWith('data:application/octet')))
}

/** Split regulations text into sections by common Arabic numbered patterns */
function parseRegulations(text: string): { title: string; body: string }[] {
  if (!text?.trim()) return []
  // Try to split by lines starting with: ١- ، 1- ، المادة ، الفصل ، أولاً ، أولا
  const sectionRe = /^(المادة|الفصل|الباب|أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|ثامناً|تاسعاً|عاشراً|\d+[\.\-\)\:]|[١-٩٠]+[\.\-\)\:])/m
  const lines = text.split('\n')
  const sections: { title: string; body: string }[] = []
  let current: { title: string; body: string[] } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (sectionRe.test(trimmed)) {
      if (current) sections.push({ title: current.title, body: current.body.join('\n').trim() })
      current = { title: trimmed, body: [] }
    } else {
      if (current) current.body.push(trimmed)
      else sections.push({ title: '', body: trimmed })
    }
  }
  if (current) sections.push({ title: current.title, body: current.body.join('\n').trim() })
  return sections
}

/* ─────────────────────────────────────────────────────
   Components
───────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 p-5 rounded-2xl text-center ${accent ? 'bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700' : 'bg-white dark:bg-brand-900 border border-brand-100 dark:border-brand-800'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-gold-100 dark:bg-gold-900/40 text-gold-600 dark:text-gold-400' : 'bg-brand-100 dark:bg-brand-800 text-brand-600 dark:text-brand-300'}`}>
        <Icon size={18} />
      </div>
      <div className="text-xs text-brand-500 dark:text-brand-400">{label}</div>
      <div className={`font-bold text-sm ${accent ? 'text-gold-700 dark:text-gold-300' : 'text-brand-900 dark:text-brand-100'}`}>{value}</div>
    </div>
  )
}

function GoalCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300',
    gold:  'bg-gold-100 dark:bg-gold-900/40 text-gold-700 dark:text-gold-400',
    teal:  'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
    rose:  'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
  }
  return (
    <div className="card card-body hover:-translate-y-1 transition">
      <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon size={22} />
      </div>
      <h3 className="font-bold text-brand-950 dark:text-brand-50 mb-1.5">{title}</h3>
      <p className="text-sm text-brand-600 dark:text-brand-400 leading-relaxed">{desc}</p>
    </div>
  )
}

function RegSection({ section, idx }: { section: { title: string; body: string }; idx: number }) {
  const [open, setOpen] = useState(idx < 3) // first 3 open by default
  return (
    <div className="border border-brand-100 dark:border-brand-800 rounded-xl overflow-hidden">
      {section.title ? (
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-brand-50 dark:bg-brand-800/50 hover:bg-brand-100 dark:hover:bg-brand-800 transition text-right"
        >
          <span className="font-semibold text-brand-900 dark:text-brand-100 text-sm">{section.title}</span>
          {open ? <ChevronUp size={16} className="text-brand-400 shrink-0" /> : <ChevronDown size={16} className="text-brand-400 shrink-0" />}
        </button>
      ) : null}
      {(open || !section.title) && section.body && (
        <div className="px-5 py-4 text-sm text-brand-700 dark:text-brand-300 leading-relaxed whitespace-pre-line bg-white dark:bg-brand-900">
          {section.body}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────── */
export default function AboutPage() {
  const [s, setS] = useState<any>(null)

  useEffect(() => {
    api.settings.publicGet().then(r => setS(r.settings || {}))
  }, [])

  if (!s) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  const fundName   = s.fund_name   || 'صندوق أكناف القربى'
  const familyName = s.family_name || 'عائلة البادي'
  const regSections = parseRegulations(s.regulations || '')

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* ─── Hero ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-950 text-white px-8 py-12 text-center">
        {/* Decorative blurs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-gold-300 text-xs font-bold px-4 py-1.5 rounded-full mb-5">
            <Award size={12} /> مرخص ومعتمد رسمياً
          </div>
          <h1 className="font-display text-4xl font-extrabold mb-2">{fundName}</h1>
          <p className="text-gold-300 text-xl font-bold mb-4">عائلة {familyName}</p>
          {s.about && (
            <p className="max-w-2xl mx-auto text-brand-300 text-base leading-relaxed">
              {s.about}
            </p>
          )}
        </div>
      </div>

      {/* ─── Stats ─── */}
      {(s.founded_year || s.license_number || s.license_date) && (
        <div className={`grid gap-4 ${[s.founded_year, s.license_number, s.license_date].filter(Boolean).length === 1 ? 'grid-cols-1 max-w-xs' : [s.founded_year, s.license_number, s.license_date].filter(Boolean).length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {s.founded_year  && <StatCard icon={CalendarDays} label="سنة التأسيس"  value={s.founded_year}  />}
          {s.license_number && <StatCard icon={Hash}         label="رقم الترخيص"  value={s.license_number} accent />}
          {s.license_date   && <StatCard icon={Shield}       label="تاريخ الترخيص" value={s.license_date}  />}
        </div>
      )}

      {/* ─── Goals ─── */}
      <div>
        <div className="mb-6">
          <p className="text-xs font-black tracking-widest text-gold-600 dark:text-gold-400 uppercase mb-1">أهدافنا</p>
          <h2 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">لماذا أُسِّس الصندوق؟</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GoalCard icon={HandHeart} color="brand" title="دعم الأسر"
            desc="تقديم المساعدة المالية لأبناء العائلة في المناسبات والأوقات الصعبة." />
          <GoalCard icon={Heart} color="rose" title="تعزيز الترابط"
            desc="تمتين أواصر القربى وتعزيز التواصل بين أبناء العائلة." />
          <GoalCard icon={TrendingUp} color="teal" title="الشفافية المالية"
            desc="إدارة الموارد بشفافية ووضوح، مع تقارير دورية للأعضاء." />
          <GoalCard icon={Scale} color="gold" title="العدالة والمساواة"
            desc="توزيع الدعم بعدالة وفق معايير واضحة ومُعلنة." />
        </div>
      </div>

      {/* ─── License document ─── */}
      {s.license_image && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-gold-500" />
              <h2 className="font-bold text-brand-950 dark:text-brand-50">وثيقة الترخيص الرسمي</h2>
            </div>
            <a
              href={s.license_image}
              download={isPdf(s.license_image) ? 'license.pdf' : 'license.jpg'}
              className="btn-secondary text-xs !py-1.5"
            >
              <Download size={14} /> تحميل
            </a>
          </div>
          <div className="p-6 flex justify-center bg-brand-50/40 dark:bg-brand-900/40">
            {isPdf(s.license_image) ? (
              <embed
                src={s.license_image}
                type="application/pdf"
                className="w-full rounded-xl border border-brand-200 dark:border-brand-700"
                style={{ height: 560 }}
              />
            ) : (
              <img
                src={s.license_image}
                alt="وثيقة الترخيص الرسمي"
                className="max-h-[560px] w-auto rounded-xl border border-brand-200 dark:border-brand-700 shadow-sm object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* ─── Regulations ─── */}
      {(s.regulations_doc || s.regulations) && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-brand-400" />
              <h2 className="font-bold text-brand-950 dark:text-brand-50">لائحة الصندوق</h2>
            </div>
            {s.regulations_doc && (
              <a href={s.regulations_doc} download="regulations.pdf" className="btn-secondary text-xs !py-1.5">
                <Download size={14} /> تحميل PDF
              </a>
            )}
          </div>

          {s.regulations_doc ? (
            /* ── PDF embed ── */
            <div className="p-6 bg-brand-50/40 dark:bg-brand-900/40">
              <embed
                src={s.regulations_doc}
                type="application/pdf"
                className="w-full rounded-xl border border-brand-200 dark:border-brand-700"
                style={{ height: 700 }}
              />
            </div>
          ) : (
            /* ── Text fallback ── */
            <div className="p-6 space-y-3">
              {regSections.length > 0 ? (
                regSections.map((sec, i) => <RegSection key={i} section={sec} idx={i} />)
              ) : (
                <div className="bg-brand-50 dark:bg-brand-800/50 rounded-xl p-5 text-sm text-brand-700 dark:text-brand-300 leading-loose whitespace-pre-line">
                  {s.regulations}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Contact ─── */}
      {(s.phone || s.email || s.whatsapp_number) && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-800 flex items-center gap-2">
            <Users size={18} className="text-brand-400" />
            <h2 className="font-bold text-brand-950 dark:text-brand-50">التواصل مع الصندوق</h2>
          </div>
          <div className="p-6 grid sm:grid-cols-2 gap-4">
            {s.phone && (
              <a href={`tel:${s.phone}`} className="flex items-center gap-3 bg-brand-50 dark:bg-brand-800/50 rounded-xl px-4 py-3 hover:bg-brand-100 dark:hover:bg-brand-800 transition">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-700 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <div className="text-xs text-brand-500 dark:text-brand-400">رقم الجوال</div>
                  <div className="font-semibold text-brand-900 dark:text-brand-100 text-sm" dir="ltr">{s.phone}</div>
                </div>
              </a>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} className="flex items-center gap-3 bg-brand-50 dark:bg-brand-800/50 rounded-xl px-4 py-3 hover:bg-brand-100 dark:hover:bg-brand-800 transition">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-700 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <div className="text-xs text-brand-500 dark:text-brand-400">البريد الإلكتروني</div>
                  <div className="font-semibold text-brand-900 dark:text-brand-100 text-sm" dir="ltr">{s.email}</div>
                </div>
              </a>
            )}
            {s.whatsapp_number && (
              <a href={`https://wa.me/${s.whatsapp_number.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                </div>
                <div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">واتساب</div>
                  <div className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm" dir="ltr">{s.whatsapp_number}</div>
                </div>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ─── Empty state ─── */}
      {!s.license_image && !s.regulations && !s.regulations_doc && !s.about && !s.phone && (
        <div className="card card-body text-center text-brand-500 dark:text-brand-400 py-12">
          <Eye size={32} className="mx-auto mb-3 text-brand-300 dark:text-brand-600" />
          <p className="font-semibold mb-1">لم يتم إضافة محتوى التعريف بعد</p>
          <p className="text-xs">يمكن للمدير إضافة النبذة واللائحة والترخيص من إعدادات الصندوق</p>
        </div>
      )}

    </div>
  )
}
