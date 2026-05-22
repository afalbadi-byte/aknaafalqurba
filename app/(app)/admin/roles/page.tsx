'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { ROLE_LABELS } from '@/lib/utils'
import { Check, Minus, UserCog, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/app-shell'

/* ── Permission matrix definition ── */
const ROLES = ['member', 'aid_committee', 'treasurer', 'president', 'admin'] as const
type Role = typeof ROLES[number]

const PERMISSIONS: { label: string; section: string; roles: Role[] }[] = [
  // ── عضو عادي ──
  { section: 'الخدمات الأساسية', label: 'عرض الأخبار والإعلانات',  roles: ['member','aid_committee','treasurer','president','admin'] },
  { section: 'الخدمات الأساسية', label: 'تقديم دفعة اشتراك / تبرع', roles: ['member','aid_committee','treasurer','president','admin'] },
  { section: 'الخدمات الأساسية', label: 'تقديم طلب معونة',          roles: ['member','aid_committee','treasurer','president','admin'] },
  { section: 'الخدمات الأساسية', label: 'إدارة الملف الشخصي',       roles: ['member','aid_committee','treasurer','president','admin'] },
  // ── لجنة ──
  { section: 'لوحة الإدارة',    label: 'الدخول للوحة الإدارة',      roles: ['aid_committee','treasurer','president','admin'] },
  { section: 'لوحة الإدارة',    label: 'عرض قائمة الأعضاء',         roles: ['aid_committee','treasurer','president','admin'] },
  { section: 'لوحة الإدارة',    label: 'نشر الأخبار وإدارتها',       roles: ['aid_committee','treasurer','president','admin'] },
  { section: 'لوحة الإدارة',    label: 'مراجعة طلبات المعونات',      roles: ['aid_committee','president','admin'] },
  // ── أمين الصندوق ──
  { section: 'الصندوق',         label: 'مراجعة واعتماد الدفعات',     roles: ['treasurer','president','admin'] },
  { section: 'الصندوق',         label: 'إضافة مصروفات',             roles: ['treasurer','president','admin'] },
  { section: 'الصندوق',         label: 'عرض التقارير المالية',       roles: ['treasurer','president','admin'] },
  // ── رئيس الصندوق / مدير ──
  { section: 'الإدارة العليا',   label: 'قبول ورفض طلبات العضوية',   roles: ['president','admin'] },
  { section: 'الإدارة العليا',   label: 'تغيير أدوار الأعضاء',       roles: ['president','admin'] },
  { section: 'الإدارة العليا',   label: 'إيقاف وتفعيل الحسابات',     roles: ['president','admin'] },
  { section: 'الإدارة العليا',   label: 'إعدادات المنصة',            roles: ['president','admin'] },
  { section: 'الإدارة العليا',   label: 'سجل النشاط والتدقيق',       roles: ['president','admin'] },
  { section: 'الإدارة العليا',   label: 'مهاجرات قاعدة البيانات',    roles: ['president','admin'] },
]

const ROLE_COLORS: Record<Role, string> = {
  member:        'bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300',
  aid_committee: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
  treasurer:     'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  president:     'bg-gold-100 dark:bg-gold-900/40 text-gold-700 dark:text-gold-400',
  admin:         'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
}

const SECTION_ORDER = ['الخدمات الأساسية', 'لوحة الإدارة', 'الصندوق', 'الإدارة العليا']

export default function RolesPage() {
  const [members,  setMembers]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [busy,     setBusy]     = useState<number | null>(null)
  const [selfRole, setSelfRole] = useState<string>('')

  useEffect(() => {
    api.auth.me().then(r => setSelfRole(r.user?.role))
    load()
  }, [])

  async function load() {
    setLoading(true)
    try { const r = await api.members.list(); setMembers(r.members) }
    finally { setLoading(false) }
  }

  async function changeRole(id: number, role: string) {
    setBusy(id)
    try { await api.members.setRole(id, role); await load() }
    finally { setBusy(null) }
  }

  // Group members by role
  const byRole: Record<string, any[]> = {}
  for (const r of ROLES) byRole[r] = []
  for (const m of members) {
    if (byRole[m.role]) byRole[m.role].push(m)
    else byRole[m.role] = [m]
  }

  // Get unique sections in order
  const sections = SECTION_ORDER

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">إدارة الصلاحيات</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">مصفوفة الأدوار والصلاحيات — وتعيين الأعضاء لكل دور</p>
      </div>

      {/* ── Permission Matrix ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-100 dark:border-brand-800">
          <h2 className="font-bold text-brand-950 dark:text-brand-50 text-base">مصفوفة الصلاحيات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-50 dark:bg-brand-800">
                <th className="text-right p-3 font-semibold text-brand-700 dark:text-brand-300 w-64">الصلاحية</th>
                {ROLES.map(r => (
                  <th key={r} className="p-3 text-center min-w-[110px]">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${ROLE_COLORS[r]}`}>
                      {ROLE_LABELS[r]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map(section => {
                const perms = PERMISSIONS.filter(p => p.section === section)
                return perms.map((p, i) => (
                  <tr key={p.label}
                    className={`border-t border-brand-50 dark:border-brand-800/60 ${
                      i === 0 ? 'border-t-2 border-brand-200 dark:border-brand-700' : ''
                    } hover:bg-brand-50/40 dark:hover:bg-brand-800/30`}>
                    <td className="p-3 text-brand-800 dark:text-brand-200 font-medium">
                      {i === 0 && (
                        <div className="text-[10px] uppercase tracking-wider text-brand-400 dark:text-brand-500 font-bold mb-0.5">{section}</div>
                      )}
                      {p.label}
                    </td>
                    {ROLES.map(r => (
                      <td key={r} className="p-3 text-center">
                        {p.roles.includes(r) ? (
                          <Check size={18} className="mx-auto text-emerald-500 dark:text-emerald-400" strokeWidth={2.5} />
                        ) : (
                          <Minus size={16} className="mx-auto text-brand-200 dark:text-brand-700" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Members by Role ── */}
      <div>
        <h2 className="font-bold text-brand-950 dark:text-brand-50 text-base mb-4">الأعضاء حسب الدور</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ROLES.map(role => (
            <div key={role} className="card overflow-hidden">
              {/* Header */}
              <div className={`px-4 py-3 flex items-center justify-between border-b border-brand-100 dark:border-brand-800`}>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
                <span className="text-xs text-brand-400 dark:text-brand-500 font-mono">
                  {byRole[role]?.length || 0} عضو
                </span>
              </div>

              {/* Members list */}
              <div className="divide-y divide-brand-50 dark:divide-brand-800 max-h-72 overflow-y-auto">
                {loading && <div className="p-4 text-center text-sm text-brand-400">جاري التحميل...</div>}
                {!loading && (byRole[role]?.length === 0) && (
                  <div className="p-4 text-center text-xs text-brand-400 dark:text-brand-600">لا يوجد أعضاء بهذا الدور</div>
                )}
                {!loading && byRole[role]?.map(m => (
                  <div key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                    <Avatar name={m.full_name} src={m.avatar} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-brand-900 dark:text-brand-100 text-sm truncate">{m.full_name}</div>
                      <div className="text-[11px] text-brand-400 font-mono">{m.phone}</div>
                    </div>

                    {/* Role change — only for president/admin, and can't change own role */}
                    {['president','admin'].includes(selfRole) && (
                      busy === m.id ? (
                        <Loader2 size={14} className="animate-spin text-brand-400" />
                      ) : (
                        <select
                          value={m.role}
                          onChange={e => changeRole(m.id, e.target.value)}
                          className="text-xs border border-brand-200 dark:border-brand-700 rounded-lg px-2 py-1 bg-white dark:bg-brand-900 text-brand-800 dark:text-brand-200 focus:outline-none focus:ring-2 focus:ring-gold-400"
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="card card-body">
        <h3 className="font-bold text-brand-950 dark:text-brand-50 text-sm mb-3">وصف الأدوار</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {([
            { role: 'member',        desc: 'يقدّم دفعاته ومعوناته ويتابع أخبار العائلة فقط' },
            { role: 'aid_committee', desc: 'يراجع طلبات المعونات وينشر الأخبار بالإضافة لحقوق العضو' },
            { role: 'treasurer',     desc: 'يتولى الدفعات والمصروفات والتقارير المالية' },
            { role: 'president',     desc: 'صلاحيات كاملة: يوافق على العضوية ويعيّن الأدوار ويدير الإعدادات' },
            { role: 'admin',         desc: 'مدير النظام التقني — صلاحيات كاملة وإضافية كالمهاجرات والسجل' },
          ] as { role: Role; desc: string }[]).map(({ role, desc }) => (
            <div key={role} className="flex gap-3">
              <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold h-fit ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>
              <span className="text-brand-600 dark:text-brand-400 text-xs leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
