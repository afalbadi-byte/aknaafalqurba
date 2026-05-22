'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import { formatMoney, formatDate, statusBadge, STATUS_LABELS, NEWS_CATEGORIES, PAYMENT_METHODS } from '@/lib/utils'
import { Wallet, FileHeart, Newspaper, Bell, ChevronLeft, Plus, AlertCircle, Mail, Loader2, ShieldCheck } from 'lucide-react'

export default function Dashboard() {
  const [stats,  setStats]  = useState<any>(null)
  const [news,   setNews]   = useState<any[]>([])
  const [recent, setRecent] = useState<any[]>([])
  const [user,   setUser]   = useState<any>(null)

  // Email verification
  const [verStep, setVerStep] = useState<'idle' | 'code'>('idle')
  const [verCode, setVerCode] = useState('')
  const [verBusy, setVerBusy] = useState(false)
  const [verMsg,  setVerMsg]  = useState<any>(null)

  useEffect(() => {
    api.auth.me().then(r => setUser(r.user))
    api.reports.dashboard().then(setStats).catch(() => {})
    api.news.list().then(r => setNews(r.news.slice(0, 4))).catch(() => {})
    api.payments.mine().then(r => setRecent(r.payments.slice(0, 5))).catch(() => {})
  }, [])

  async function sendVerCode() {
    setVerBusy(true); setVerMsg(null)
    try {
      await api.auth.resendVerification(user.id)
      setVerStep('code')
    } catch (err: any) { setVerMsg({ ok: false, text: err.message }) }
    finally { setVerBusy(false) }
  }

  async function confirmVerCode(e: React.FormEvent) {
    e.preventDefault(); setVerBusy(true); setVerMsg(null)
    try {
      await api.auth.verifyEmail(user.id, verCode)
      setUser((u: any) => ({ ...u, email_verified: true }))
      setVerStep('idle'); setVerCode('')
    } catch (err: any) { setVerMsg({ ok: false, text: err.message }) }
    finally { setVerBusy(false) }
  }

  if (!user) return <div className="text-center text-brand-500 py-12">جاري التحميل...</div>

  const isCommittee = ['admin','president','treasurer','aid_committee','secretary'].includes(user.role)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="card card-body bg-gradient-to-l from-brand-950 to-brand-700 text-white border-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-brand-100 mb-1">أهلاً وسهلاً</div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold">{user.full_name}</h1>
            {user.branch && <div className="text-sm text-gold-300 mt-1 font-bold">{user.branch}</div>}
          </div>
          <Link href="/payments/new" className="btn-gold !px-5"><Plus size={18} /> دفعة جديدة</Link>
        </div>
      </div>

      {/* Email verification banner */}
      {user.email && !user.email_verified && (
        <div className="card border-amber-300 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-900/10 overflow-hidden">
          <div className="px-6 py-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Mail size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-amber-800 dark:text-amber-300 text-sm">بريدك الإلكتروني غير مفعّل</div>
                <div className="text-xs text-amber-700/80 dark:text-amber-400/80 truncate">{user.email}</div>
              </div>
            </div>
            {verStep === 'idle' ? (
              <button onClick={sendVerCode} disabled={verBusy}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white font-bold text-sm transition">
                {verBusy ? <Loader2 className="animate-spin" size={14}/> : <Mail size={14}/>}
                إرسال رمز التفعيل
              </button>
            ) : (
              <form onSubmit={confirmVerCode} className="flex items-center gap-2 flex-wrap">
                <div className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1 shrink-0">
                  <ShieldCheck size={13}/> أرسلنا الرمز إلى بريدك
                </div>
                <input
                  className="input w-36 text-center font-mono font-bold tracking-widest text-lg"
                  type="text" inputMode="numeric" maxLength={6}
                  placeholder="• • • • • •"
                  value={verCode}
                  onChange={e => setVerCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                />
                <button type="submit" disabled={verBusy || verCode.length !== 6}
                  className="btn-primary !py-2">
                  {verBusy && <Loader2 className="animate-spin" size={14}/>} تفعيل
                </button>
                <button type="button" className="btn-secondary !py-2"
                  onClick={() => { setVerStep('idle'); setVerCode(''); setVerMsg(null) }}>
                  إلغاء
                </button>
              </form>
            )}
          </div>
          {verMsg && (
            <div className={`px-6 pb-4 text-sm font-semibold ${verMsg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {verMsg.text}
            </div>
          )}
        </div>
      )}

      {stats?.personal && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Wallet}    label="إجمالي مدفوعاتك"      value={formatMoney(stats.personal.total_paid)} color="brand" />
          <Stat icon={Wallet}    label="بانتظار المراجعة"      value={stats.personal.pending_count} color="amber" />
          <Stat icon={FileHeart} label="طلبات الدعم"        value={stats.personal.total_requests}
                sub={stats.personal.open_requests ? `${stats.personal.open_requests} مفتوحة` : null} color="gold" />
          <Stat icon={Bell}      label="إشعارات غير مقروءة"   value={stats.personal.unread_notifs} color="teal" />
        </div>
      )}

      {isCommittee && stats?.fund && (
        <div className="card">
          <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-700 flex items-center justify-between">
            <h3 className="font-bold text-brand-950 dark:text-brand-50">إحصاءات الصندوق</h3>
            <Link href="/admin/reports" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">عرض التقارير الكاملة ←</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-brand-100 dark:divide-brand-700 [direction:rtl]">
            <Mini label="رصيد الصندوق"     value={formatMoney(stats.fund.balance)}        color="text-emerald-600 dark:text-emerald-400" />
            <Mini label="إجمالي المحصّل"    value={formatMoney(stats.fund.total_collected)} />
            <Mini label="إجمالي المصروفات" value={formatMoney(stats.fund.total_expenses)}  color="text-red-600 dark:text-red-400" />
            <Mini label="الأعضاء"           value={stats.fund.members_active} sub={`${stats.fund.members_pending} بانتظار`} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-700 flex items-center justify-between">
            <h3 className="font-bold text-brand-950 dark:text-brand-50">آخر دفعاتك</h3>
            <Link href="/payments" className="text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
              عرض الكل <ChevronLeft size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto mb-2 text-brand-300 dark:text-brand-600" />
              <p className="text-brand-500 dark:text-brand-400 text-sm mb-4">لم تسجّل أي دفعة بعد</p>
              <Link href="/payments/new" className="btn-primary"><Plus size={16} /> سجّل أول دفعة</Link>
            </div>
          ) : (
            <div className="divide-y divide-brand-50 dark:divide-brand-800">
              {recent.map(p => (
                <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-brand-950 dark:text-brand-50">{formatMoney(p.amount)}</div>
                    <div className="text-xs text-brand-500 dark:text-brand-400">{PAYMENT_METHODS[p.method]} · {formatDate(p.created_at)}</div>
                  </div>
                  <span className={statusBadge(p.status)}>{STATUS_LABELS[p.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-700 flex items-center justify-between">
            <h3 className="font-bold text-brand-950 dark:text-brand-50 flex items-center gap-2"><Newspaper size={18} /> آخر الأخبار</h3>
            <Link href="/news" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">الكل ←</Link>
          </div>
          {news.length === 0 ? (
            <div className="p-6 text-center text-brand-500 dark:text-brand-400 text-sm">لا توجد أخبار</div>
          ) : (
            <div className="divide-y divide-brand-50 dark:divide-brand-800">
              {news.map(n => (
                <Link key={n.id} href={`/news/${n.id}`} className="block px-6 py-3 hover:bg-brand-50/50 dark:hover:bg-brand-800/50">
                  <span className="badge badge-info text-[10px] mb-1">{NEWS_CATEGORIES[n.category]}</span>
                  <div className="font-semibold text-brand-950 dark:text-brand-50 line-clamp-2 text-sm">{n.title}</div>
                  <div className="text-[11px] text-brand-400 dark:text-brand-500 mt-1">{formatDate(n.published_at)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub, color }: any) {
  const palette: Record<string, string> = {
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-800 dark:text-brand-300',
    gold:  'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    teal:  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  }
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-xl ${palette[color]} flex items-center justify-center mb-3`}>
        <Icon size={22} />
      </div>
      <div className="text-sm text-brand-500 dark:text-brand-400 font-semibold">{label}</div>
      <div className="text-2xl font-bold text-brand-950 dark:text-brand-50 mt-1">{value ?? 0}</div>
      {sub && <div className="text-xs text-brand-500 dark:text-brand-400 mt-1">{sub}</div>}
    </div>
  )
}

function Mini({ label, value, sub, color = 'text-brand-950 dark:text-brand-50' }: any) {
  return (
    <div className="p-5 text-center">
      <div className="text-xs text-brand-500 dark:text-brand-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-brand-400 dark:text-brand-500 mt-1">{sub}</div>}
    </div>
  )
}
