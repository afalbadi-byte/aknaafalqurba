'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import { formatMoney } from '@/lib/utils'
import { Users, CreditCard, FileHeart, Banknote, TrendingUp, Newspaper } from 'lucide-react'

export default function AdminHome() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => { api.reports.dashboard().then(setStats) }, [])
  const f = stats?.fund

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">لوحة الإدارة</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">نظرة شاملة على حالة الصندوق</p>
      </header>

      {f && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={TrendingUp} label="رصيد الصندوق" value={formatMoney(f.balance)} color="emerald" />
            <Stat icon={CreditCard} label="إجمالي المحصّل" value={formatMoney(f.total_collected)} color="brand" />
            <Stat icon={Banknote}   label="إجمالي المصروفات" value={formatMoney(f.total_expenses)} color="red" />
            <Stat icon={Users}      label="الأعضاء النشطون" value={f.members_active} sub={`${f.members_total} كلي`} color="gold" />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Action to="/admin/payments?status=pending" icon={CreditCard} count={f.pending_payments} label="دفعات بانتظار المراجعة" color="amber" />
            <Action to="/admin/aid?status=submitted"    icon={FileHeart}  count={f.aid_open}         label="طلبات دعم مفتوحة"     color="teal" />
            <Action to="/admin/members?status=pending"  icon={Users}      count={f.members_pending}  label="طلبات عضوية بانتظار التفعيل" color="gold" />
          </div>
        </>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Quick to="/admin/members"  icon={Users}      label="إدارة الأعضاء" />
        <Quick to="/admin/payments" icon={CreditCard} label="مراجعة الدفعات" />
        <Quick to="/admin/expenses" icon={Banknote}   label="المصروفات" />
        <Quick to="/admin/news"     icon={Newspaper}  label="نشر الأخبار" />
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub, color }: any) {
  const palette: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    brand:   'bg-brand-100 text-brand-700 dark:bg-brand-800 dark:text-brand-300',
    red:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    gold:    'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400',
  }
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-xl ${palette[color]} flex items-center justify-center mb-3`}>
        <Icon size={22} />
      </div>
      <div className="text-sm text-brand-500 dark:text-brand-400 font-semibold">{label}</div>
      <div className="text-2xl font-bold text-brand-950 dark:text-brand-50 mt-1">{value}</div>
      {sub && <div className="text-xs text-brand-500 dark:text-brand-400 mt-1">{sub}</div>}
    </div>
  )
}

function Action({ to, icon: Icon, count, label, color }: any) {
  const palette: Record<string, string> = {
    amber: 'from-amber-500 to-amber-600',
    teal:  'from-teal-500 to-teal-600',
    gold:  'from-gold-500 to-gold-600',
  }
  return (
    <Link href={to} className={`block rounded-2xl p-5 text-white bg-gradient-to-l ${palette[color]} shadow-card hover:scale-[1.02] transition`}>
      <div className="flex items-center gap-3">
        <Icon size={28} />
        <div>
          <div className="text-3xl font-bold leading-none">{count || 0}</div>
          <div className="text-sm font-semibold mt-1 opacity-90">{label}</div>
        </div>
      </div>
    </Link>
  )
}

function Quick({ to, icon: Icon, label }: any) {
  return (
    <Link href={to} className="card card-body hover:shadow-lg transition flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center">
        <Icon size={20} />
      </div>
      <span className="font-semibold text-brand-800 dark:text-brand-200">{label}</span>
    </Link>
  )
}
