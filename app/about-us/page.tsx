import Link from 'next/link'
import { sql } from '@/lib/db'
import Logo from '@/components/logo'
import DarkToggle from '@/components/dark-toggle'
import {
  Shield, Phone, Mail, Hash, CalendarDays, BookOpen, Users,
  HandHeart, TrendingUp, Download, Award, Heart, Scale, ArrowLeft,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────── */
async function loadSettings() {
  try {
    const rows = await sql<{ key_name: string; key_value: string }[]>`
      SELECT key_name, key_value FROM settings
      WHERE key_name IN (
        'fund_name','family_name','founded_year','about',
        'license_number','license_date','license_image',
        'regulations','regulations_doc',
        'phone','email','whatsapp_number'
      )
    `
    const s: Record<string, string> = {}
    for (const r of rows) s[r.key_name] = r.key_value
    return s
  } catch {
    return {} as Record<string, string>
  }
}

function isPdf(src?: string) {
  return !!(src && (src.startsWith('data:application/pdf') || src.startsWith('data:application/octet')))
}

/* ─────────────────────────────────────────────────────
   Page (Server Component)
───────────────────────────────────────────────────── */
export default async function AboutUsPage() {
  const s = await loadSettings()

  const fundName   = s.fund_name   || 'صندوق أكناف القربى'
  const familyName = s.family_name || 'عائلة البادي'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-brand-950">

      {/* ─── Header ─── */}
      <header className="bg-white/90 dark:bg-brand-950/90 backdrop-blur border-b border-brand-100 dark:border-brand-800 sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/public-news" className="btn-ghost hidden sm:inline-flex">أخبار العائلة</Link>
            <DarkToggle />
            <Link href="/login"    className="btn-ghost">دخول الأعضاء</Link>
            <Link href="/register" className="btn-primary">انضم للصندوق</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-10 max-w-4xl space-y-8">

        {/* ─── Hero ─── */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-950 text-white px-8 py-14 text-center">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            {s.license_number && (
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-gold-300 text-xs font-bold px-4 py-1.5 rounded-full mb-5">
                <Award size={12} /> مرخص رسمياً — رقم {s.license_number}
              </div>
            )}
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold mb-3 leading-tight">{fundName}</h1>
            <p className="text-gold-300 text-xl font-bold mb-4">عائلة {familyName}</p>
            {s.about && (
              <p className="max-w-2xl mx-auto text-brand-300 text-base leading-relaxed">{s.about}</p>
            )}
          </div>
        </div>

        {/* ─── Stats ─── */}
        {(s.founded_year || s.license_number || s.license_date) && (
          <div className={`grid gap-4 ${
            [s.founded_year, s.license_number, s.license_date].filter(Boolean).length === 3
              ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
          }`}>
            {s.founded_year  && <StatCard icon={CalendarDays} label="سنة التأسيس"   value={s.founded_year} />}
            {s.license_number && <StatCard icon={Hash}         label="رقم الترخيص"   value={s.license_number} accent />}
            {s.license_date   && <StatCard icon={Shield}       label="تاريخ الترخيص" value={s.license_date} />}
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
            <GoalCard icon={Heart}     color="rose"  title="تعزيز الترابط"
              desc="تمتين أواصر القربى وتعزيز التواصل بين أبناء العائلة." />
            <GoalCard icon={TrendingUp} color="teal" title="الشفافية المالية"
              desc="إدارة الموارد بشفافية ووضوح، مع تقارير دورية للأعضاء." />
            <GoalCard icon={Scale}     color="gold"  title="العدالة والمساواة"
              desc="توزيع الدعم بعدالة وفق معايير واضحة ومُعلنة." />
          </div>
        </div>

        {/* ─── License ─── */}
        {s.license_image && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-gold-500" />
                <h2 className="font-bold text-brand-950 dark:text-brand-50">وثيقة الترخيص الرسمي</h2>
              </div>
              <a href={s.license_image} download={isPdf(s.license_image) ? 'license.pdf' : 'license.jpg'}
                className="btn-secondary text-xs !py-1.5">
                <Download size={14} /> تحميل
              </a>
            </div>
            <div className="p-6 flex justify-center bg-brand-50/40 dark:bg-brand-900/40">
              {isPdf(s.license_image) ? (
                <embed src={s.license_image} type="application/pdf"
                  className="w-full rounded-xl border border-brand-200 dark:border-brand-700"
                  style={{ height: 560 }} />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={s.license_image} alt="وثيقة الترخيص"
                  className="max-h-[560px] w-auto rounded-xl border border-brand-200 dark:border-brand-700 shadow-sm object-contain" />
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
              <div className="p-6 bg-brand-50/40 dark:bg-brand-900/40">
                <embed src={s.regulations_doc} type="application/pdf"
                  className="w-full rounded-xl border border-brand-200 dark:border-brand-700"
                  style={{ height: 700 }} />
              </div>
            ) : (
              <div className="p-6">
                <div className="bg-brand-50 dark:bg-brand-800/50 rounded-xl p-5 text-sm text-brand-700 dark:text-brand-300 leading-loose whitespace-pre-line">
                  {s.regulations}
                </div>
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
            <div className="p-6 grid sm:grid-cols-3 gap-4">
              {s.phone && (
                <a href={`tel:${s.phone}`}
                  className="flex items-center gap-3 bg-brand-50 dark:bg-brand-800/50 rounded-xl px-4 py-3 hover:bg-brand-100 dark:hover:bg-brand-800 transition">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-700 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-brand-500">الجوال</div>
                    <div className="font-semibold text-brand-900 dark:text-brand-100 text-sm" dir="ltr">{s.phone}</div>
                  </div>
                </a>
              )}
              {s.email && (
                <a href={`mailto:${s.email}`}
                  className="flex items-center gap-3 bg-brand-50 dark:bg-brand-800/50 rounded-xl px-4 py-3 hover:bg-brand-100 dark:hover:bg-brand-800 transition">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-700 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-brand-500">البريد</div>
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

        {/* ─── CTA ─── */}
        <div className="card card-body text-center py-10">
          <h2 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50 mb-2">
            أنت من عائلة البادي؟
          </h2>
          <p className="text-brand-600 dark:text-brand-400 text-sm mb-6 max-w-md mx-auto">
            انضم لصندوق العائلة وكن جزءاً من منظومة التكافل والدعم المتبادل
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn-primary !px-8 !py-3">
              <Users size={18} /> سجّل عضويتك
            </Link>
            <Link href="/login" className="btn-secondary !px-8 !py-3">
              دخول الأعضاء <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-brand-950 text-brand-400 py-8 border-t border-brand-900 mt-4">
        <div className="container mx-auto px-4 sm:px-6 text-center text-xs space-y-3">
          <Logo size={48} variant="white" className="justify-center" />
          <p>© {new Date().getFullYear()} {fundName} — عائلة {familyName}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/"          className="hover:text-brand-200 transition">الرئيسية</Link>
            <Link href="/public-news" className="hover:text-brand-200 transition">أخبار العائلة</Link>
            <Link href="/register"  className="hover:text-brand-200 transition">انضم للصندوق</Link>
            <Link href="/privacy"   className="hover:text-brand-200 transition">سياسة الخصوصية</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Sub-components (server-safe, no hooks)
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
