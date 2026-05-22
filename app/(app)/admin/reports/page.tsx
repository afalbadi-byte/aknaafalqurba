'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { formatMoney, PAYMENT_TYPES } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, Award } from 'lucide-react'

const COLORS = ['#0b2135', '#b8934b', '#84a59d', '#a68b5a', '#2b4364', '#9a7838', '#94b5ad']

export default function AdminReports() {
  const [data, setData] = useState<any>(null)
  const [memberStats, setMemberStats] = useState<any[]>([])
  useEffect(() => {
    api.reports.financial().then(setData)
    api.reports.memberStats().then(r => setMemberStats(r.members))
  }, [])
  if (!data) return <div className="text-center text-brand-500 dark:text-brand-400 py-12">جاري التحميل...</div>

  const months: Record<string, any> = {}
  data.income_monthly.forEach((r: any)  => { months[r.month] = { month: r.month, income: Number(r.total) } })
  data.expense_monthly.forEach((r: any) => {
    months[r.month] = { ...(months[r.month] || { month: r.month, income: 0 }), expense: Number(r.total) }
  })
  const monthly = Object.values(months).sort((a: any, b: any) => a.month.localeCompare(b.month))

  const totalIncome  = data.income_monthly.reduce((s: number, r: any) => s + Number(r.total), 0)
  const totalExpense = data.expense_monthly.reduce((s: number, r: any) => s + Number(r.total), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">التقارير المالية</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">إحصاءات وتقارير شاملة عن أداء الصندوق</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card icon={TrendingUp}   color="emerald" label="إيرادات آخر ١٢ شهر" value={formatMoney(totalIncome)} />
        <Card icon={TrendingDown} color="red"     label="مصروفات آخر ١٢ شهر" value={formatMoney(totalExpense)} />
        <Card icon={Award}        color="brand"   label="الصافي" value={formatMoney(totalIncome - totalExpense)} />
      </div>

      <div className="card card-body">
        <h3 className="font-bold text-brand-950 dark:text-brand-50 mb-4">الإيرادات والمصروفات الشهرية</h3>
        <div className="h-72 [direction:ltr]">
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde4ec" />
              <XAxis dataKey="month" stroke="#0b2135" fontSize={11} />
              <YAxis stroke="#0b2135" fontSize={11} />
              <Tooltip formatter={(v: any) => formatMoney(v)} />
              <Legend wrapperStyle={{ direction: 'rtl', fontSize: 12 }} />
              <Bar dataKey="income"  name="إيرادات"  fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="مصروفات" fill="#b8934b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card card-body">
          <h3 className="font-bold text-brand-950 dark:text-brand-50 mb-4">الإيرادات حسب النوع</h3>
          <div className="h-64 [direction:ltr]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.by_type.map((r: any) => ({ name: PAYMENT_TYPES[r.payment_type] || r.payment_type, value: Number(r.total) }))}
                  cx="50%" cy="50%" outerRadius={90} dataKey="value" label={(d: any) => d.name}>
                  {data.by_type.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-body">
          <h3 className="font-bold text-brand-950 dark:text-brand-50 mb-4">المصروفات حسب التصنيف</h3>
          <div className="h-64 [direction:ltr]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.expense_by_category.map((r: any) => ({ name: r.category, value: Number(r.total) }))}
                  cx="50%" cy="50%" outerRadius={90} dataKey="value" label={(d: any) => d.name}>
                  {data.expense_by_category.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-800"><h3 className="font-bold text-brand-950 dark:text-brand-50">أعلى المساهمين</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 dark:bg-brand-800 text-brand-700 dark:text-brand-300 text-xs">
              <tr>
                <th className="text-right p-3 font-semibold">#</th>
                <th className="text-right p-3 font-semibold">الاسم</th>
                <th className="text-right p-3 font-semibold">الفرع</th>
                <th className="text-right p-3 font-semibold">عدد الدفعات</th>
                <th className="text-right p-3 font-semibold">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50 dark:divide-brand-800">
              {data.top_contributors.map((c: any, i: number) => (
                <tr key={c.id} className="hover:bg-brand-50/30">
                  <td className="p-3 text-brand-500 dark:text-brand-400 font-bold">{i + 1}</td>
                  <td className="p-3 font-semibold text-brand-950 dark:text-brand-50">{c.full_name}</td>
                  <td className="p-3 text-brand-600 dark:text-brand-400">{c.branch || '—'}</td>
                  <td className="p-3 text-brand-700 dark:text-brand-300">{c.cnt}</td>
                  <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">{formatMoney(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-800"><h3 className="font-bold text-brand-950 dark:text-brand-50">إجمالي مساهمات الأعضاء</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 dark:bg-brand-800 text-brand-700 dark:text-brand-300 text-xs">
              <tr>
                <th className="text-right p-3 font-semibold">العضو</th>
                <th className="text-right p-3 font-semibold">الفرع</th>
                <th className="text-right p-3 font-semibold">عدد الدفعات</th>
                <th className="text-right p-3 font-semibold">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50 dark:divide-brand-800">
              {memberStats.map(m => (
                <tr key={m.id} className="hover:bg-brand-50/30">
                  <td className="p-3 font-semibold text-brand-950 dark:text-brand-50">{m.full_name}</td>
                  <td className="p-3 text-brand-600 dark:text-brand-400">{m.branch || '—'}</td>
                  <td className="p-3 text-brand-700 dark:text-brand-300">{m.payments_count}</td>
                  <td className="p-3 font-bold text-brand-950 dark:text-brand-50">{formatMoney(m.total_paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Card({ icon: Icon, color, label, value }: any) {
  const palette: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    red:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    brand:   'bg-brand-100 text-brand-700 dark:bg-brand-800 dark:text-brand-300',
  }
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-xl ${palette[color]} flex items-center justify-center mb-3`}><Icon size={22} /></div>
      <div className="text-sm text-brand-500 dark:text-brand-400 font-semibold">{label}</div>
      <div className="text-2xl font-bold text-brand-950 dark:text-brand-50 mt-1">{value}</div>
    </div>
  )
}
