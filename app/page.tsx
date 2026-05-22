import Link from 'next/link'
import { sql } from '@/lib/db'
import { currentUser } from '@/lib/auth'
import { NEWS_CATEGORIES, formatDate } from '@/lib/utils'
import Logo from '@/components/logo'
import DarkToggle from '@/components/dark-toggle'
import {
  HandHeart, CreditCard, Users, FileHeart, Shield, ArrowLeft,
  TrendingUp, Newspaper, Quote,
} from 'lucide-react'

async function loadData() {
  try {
    const [settingsRows, newsRows] = await Promise.all([
      sql<{ key_name: string; key_value: string }[]>`SELECT key_name, key_value FROM settings`,
      sql`SELECT n.id, n.title, n.category, n.summary, n.cover_image, n.published_at,
                m.full_name AS author_name
          FROM news n JOIN members m ON m.id = n.author_id
          WHERE n.is_public = TRUE
          ORDER BY n.is_pinned DESC, n.published_at DESC LIMIT 3`,
    ])
    const settings: Record<string, string> = {}
    for (const r of settingsRows) settings[r.key_name] = r.key_value
    return { settings, news: newsRows }
  } catch {
    return { settings: {} as Record<string, string>, news: [] as any[] }
  }
}

export default async function LandingPage() {
  const [user, data] = await Promise.all([currentUser().catch(() => null), loadData()])
  const { settings, news } = data

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white/80 dark:bg-brand-950/90 backdrop-blur border-b border-brand-100 dark:border-brand-800 sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/public-news" className="btn-ghost hidden sm:inline-flex">آخر الأخبار</Link>
            <DarkToggle />
            {user ? (
              <Link href="/dashboard" className="btn-primary">لوحة التحكم</Link>
            ) : (
              <>
                <Link href="/login"    className="btn-ghost">تسجيل الدخول</Link>
                <Link href="/register" className="btn-primary">انضم للصندوق</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="with-watermark relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 py-20 lg:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-gold-100 dark:bg-gold-900/40 text-gold-800 dark:text-gold-300 px-4 py-1.5 rounded-full text-xs font-bold mb-6">
            <HandHeart size={14} />
            تعزيز روابط القربى ودعم أبناء العائلة
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-brand-950 dark:text-brand-50 mb-5 leading-tight">
            {settings.fund_name || 'صندوق أكناف القربى'}
          </h1>
          <div className="text-xl sm:text-2xl text-gold-600 dark:text-gold-400 font-bold mb-7">
            {settings.family_name || 'عائلة البادي'}
          </div>
          <p className="max-w-2xl mx-auto text-brand-700 dark:text-brand-300 text-base sm:text-lg leading-relaxed mb-8">
            {settings.about || 'منصة متكاملة لجمع اشتراكات الصندوق، متابعة دفعاتك، أخبار العائلة، وتقديم طلبات الدعم بكل سهولة وشفافية.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn-primary !px-6 !py-3 text-base">
              <Users size={18} /> انضم لعائلة الصندوق
            </Link>
            <Link href="/login" className="btn-secondary !px-6 !py-3 text-base">
              تسجيل الدخول <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-200/30 dark:bg-teal-900/20 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gold-200/30 dark:bg-gold-900/20 rounded-full blur-3xl" />
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold text-brand-950 dark:text-brand-50 mb-3">خدمات الصندوق</h2>
        <p className="text-center text-brand-600 dark:text-brand-400 mb-12">كل ما تحتاجه في منصة واحدة آمنة وشفافة</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Feature icon={CreditCard} title="جمع الدفعات" desc="ادفع اشتراكك عبر التحويل البنكي، STC Pay، أو بطاقتك. كل دفعاتك موثّقة." color="brand" />
          <Feature icon={Newspaper}  title="أخبار العائلة" desc="تابع آخر الإعلانات والاجتماعات والمناسبات في عائلتك." color="gold" />
          <Feature icon={FileHeart}  title="طلبات الدعم" desc="قدّم طلب دعم بشكل سري وآمن، وتابع حالته خطوة بخطوة." color="teal" />
          <Feature icon={TrendingUp} title="شفافية مالية" desc="تقارير دورية بإيرادات ومصروفات الصندوق متاحة للأعضاء." color="sand" />
        </div>
      </section>

      {/* Latest news */}
      {news.length > 0 && (
        <section className="bg-brand-50/40 dark:bg-brand-900/40 py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="font-display text-3xl font-extrabold text-brand-950 dark:text-brand-50">آخر الأخبار</h2>
                <p className="text-brand-600 dark:text-brand-400 text-sm mt-1">إعلانات ومناسبات العائلة</p>
              </div>
              <Link href="/public-news" className="text-brand-700 dark:text-brand-300 hover:text-brand-950 dark:hover:text-brand-50 font-bold text-sm flex items-center gap-1">
                كل الأخبار <ArrowLeft size={16} />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {news.map((n: any) => (
                <article key={n.id} className="card hover:shadow-lg dark:hover:shadow-brand-900/50 transition group">
                  {n.cover_image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={n.cover_image} alt={n.title} className="w-full h-44 object-cover" />
                  )}
                  <div className="p-5">
                    <span className="badge badge-info mb-3">{NEWS_CATEGORIES[n.category]}</span>
                    <h3 className="font-bold text-brand-950 dark:text-brand-50 mb-2 group-hover:text-brand-700 dark:group-hover:text-gold-400 line-clamp-2">{n.title}</h3>
                    {n.summary && <p className="text-sm text-brand-600 dark:text-brand-400 line-clamp-2">{n.summary}</p>}
                    <div className="text-xs text-brand-400 dark:text-brand-500 mt-3">{formatDate(n.published_at)}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quote */}
      <section className="container mx-auto px-4 sm:px-6 py-16">
        <div className="card card-body max-w-3xl mx-auto text-center relative">
          <Quote className="absolute top-6 right-6 text-gold-300 dark:text-gold-700" size={32} />
          <p className="font-arabic text-3xl sm:text-4xl text-brand-950 dark:text-brand-50 leading-relaxed">«وَآتِ ذَا الْقُرْبَىٰ حَقَّهُ»</p>
          <p className="text-brand-500 dark:text-brand-400 text-sm mt-3">سورة الإسراء — آية 26</p>
        </div>
      </section>

      {/* Trust band */}
      <section className="bg-brand-950 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-6 text-center">
          <Trust icon={Shield}     title="بياناتك محمية" desc="جميع البيانات مشفّرة وتُحفظ بسرّية تامة" />
          <Trust icon={Users}      title="إدارة جماعية" desc="لجنة الصندوق تشرف على كل عمليات الصرف" />
          <Trust icon={TrendingUp} title="تقارير دورية"  desc="ميزانية شفافة ومتاحة لجميع الأعضاء" />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-950 text-brand-200 py-10 border-t border-brand-900">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-4">
            <Logo size={64} variant="white" className="justify-center" />
            <div className="text-sm text-brand-300 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {settings.phone &&          <span dir="ltr">📞 {settings.phone}</span>}
              {settings.email &&          <span>✉ {settings.email}</span>}
              {settings.license_number && <span>رقم الترخيص: {settings.license_number}</span>}
              {settings.license_date &&   <span>تاريخ الترخيص: {settings.license_date}</span>}
            </div>
            <div className="text-xs text-brand-500 mt-2">
              © {new Date().getFullYear()} {settings.fund_name || 'صندوق أكناف القربى'} — {settings.family_name || 'عائلة البادي'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon: Icon, title, desc, color }: any) {
  const bg: Record<string, string> = {
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-800 dark:text-brand-300',
    gold:  'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400',
    teal:  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
    sand:  'bg-sand-100 text-sand-700 dark:bg-amber-900/30 dark:text-amber-400',
  }
  return (
    <div className="card card-body hover:-translate-y-1 transition">
      <div className={`w-12 h-12 rounded-xl ${bg[color]} flex items-center justify-center mb-4`}>
        <Icon size={22} />
      </div>
      <h3 className="font-bold text-brand-950 dark:text-brand-50 mb-2">{title}</h3>
      <p className="text-sm text-brand-600 dark:text-brand-400 leading-relaxed">{desc}</p>
    </div>
  )
}

function Trust({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Icon className="text-gold-400" size={32} />
      <div className="font-bold">{title}</div>
      <div className="text-sm text-brand-300">{desc}</div>
    </div>
  )
}
