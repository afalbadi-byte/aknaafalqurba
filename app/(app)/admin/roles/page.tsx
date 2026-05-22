'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { ROLE_LABELS } from '@/lib/utils'
import { Check, Minus, Loader2, X, UserCog, ShieldPlus } from 'lucide-react'
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

/** Individual permissions that can be granted per-member beyond their role */
const INDIVIDUAL_PERMS = [
  { key: 'payment.review', label: 'مراجعة الدفعات',    desc: 'اعتماد أو رفض الدفعات' },
  { key: 'expense.manage', label: 'إدارة المصروفات',    desc: 'إضافة وحذف المصروفات' },
  { key: 'aid.review',     label: 'مراجعة المعونات',    desc: 'مراجعة طلبات المعونة وتغيير حالتها' },
  { key: 'news.publish',   label: 'نشر الأخبار',        desc: 'إضافة وتعديل وحذف الأخبار' },
  { key: 'report.view',    label: 'عرض التقارير',       desc: 'الوصول للتقارير المالية' },
  { key: 'member.view',    label: 'عرض قائمة الأعضاء', desc: 'رؤية بيانات الأعضاء كاملة' },
]

const ROLE_COLORS: Record<Role, string> = {
  member:        'bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300',
  aid_committee: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
  treasurer:     'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  president:     'bg-gold-100 dark:bg-gold-900/40 text-gold-700 dark:text-gold-400',
  admin:         'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
}

const SECTION_ORDER = ['الخدمات الأساسية', 'لوحة الإدارة', 'الصندوق', 'الإدارة العليا']

/* ── Per-member permissions modal ── */
function PermissionsModal({
  member,
  onClose,
}: {
  member: any
  onClose: () => void
}) {
  const [granted, setGranted]   = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [busy,    setBusy]      = useState<string | null>(null)
  const [error,   setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    api.permissions.list(member.id)
      .then(r => setGranted(r.permissions.map((p: any) => p.permission)))
      .catch(() => setError('تعذّر تحميل الصلاحيات'))
      .finally(() => setLoading(false))
  }, [member.id])

  async function toggle(key: string) {
    const has = granted.includes(key)
    setBusy(key)
    setError('')
    try {
      if (has) {
        await api.permissions.revoke(member.id, key)
        setGranted(g => g.filter(k => k !== key))
      } else {
        await api.permissions.grant(member.id, key)
        setGranted(g => [...g, key])
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-brand-100 dark:border-brand-700">
          <Avatar name={member.full_name} src={member.avatar} size={40} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-brand-950 dark:text-brand-50 truncate">{member.full_name}</div>
            <div className="text-xs text-brand-500 dark:text-brand-400 font-mono">{member.phone}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-800 text-brand-500">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldPlus size={15} className="text-brand-400" />
            <span className="text-sm font-bold text-brand-800 dark:text-brand-200">صلاحيات فردية إضافية</span>
            <span className="text-xs text-brand-400 dark:text-brand-500 mr-auto">تُمنح فوق صلاحيات الدور</span>
          </div>

          {error && (
            <div className="mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-brand-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {INDIVIDUAL_PERMS.map(perm => {
                const has = granted.includes(perm.key)
                const isBusy = busy === perm.key
                return (
                  <button
                    key={perm.key}
                    onClick={() => toggle(perm.key)}
                    disabled={!!busy}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-right ${
                      has
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-800/50 hover:bg-brand-100 dark:hover:bg-brand-800'
                    } disabled:opacity-60`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${has ? 'text-emerald-700 dark:text-emerald-400' : 'text-brand-800 dark:text-brand-200'}`}>
                        {perm.label}
                      </div>
                      <div className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">{perm.desc}</div>
                    </div>
                    <div className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                      has
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-brand-300 dark:border-brand-600'
                    }`}>
                      {isBusy ? (
                        <Loader2 size={12} className="animate-spin text-white" />
                      ) : has ? (
                        <Check size={13} className="text-white" strokeWidth={3} />
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-brand-100 dark:border-brand-700">
          <button onClick={onClose} className="btn-ghost w-full text-sm">إغلاق</button>
        </div>
      </div>
    </div>
  )
}

export default function RolesPage() {
  const [members,        setMembers]        = useState<any[]>([])
  const [loading,        setLoading]        = useState(true)
  const [busy,           setBusy]           = useState<number | null>(null)
  const [selfRole,       setSelfRole]       = useState<string>('')
  const [permsMember,    setPermsMember]    = useState<any | null>(null)

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

  const sections = SECTION_ORDER
  const canManagePerms = ['president', 'admin'].includes(selfRole)

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-brand-950 dark:text-brand-50 text-base">الأعضاء حسب الدور</h2>
          {canManagePerms && (
            <span className="text-xs text-brand-500 dark:text-brand-400 flex items-center gap-1.5">
              <ShieldPlus size={13} />
              اضغط على عضو لإدارة صلاحياته الفردية
            </span>
          )}
        </div>
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
                    {/* Avatar — clickable to manage permissions (president/admin only) */}
                    <button
                      onClick={() => canManagePerms && setPermsMember(m)}
                      disabled={!canManagePerms}
                      title={canManagePerms ? 'إدارة الصلاحيات الفردية' : ''}
                      className={`shrink-0 ${canManagePerms ? 'cursor-pointer hover:opacity-75 transition-opacity' : 'cursor-default'}`}
                    >
                      <Avatar name={m.full_name} src={m.avatar} size={32} />
                    </button>
                    <div
                      className={`flex-1 min-w-0 ${canManagePerms ? 'cursor-pointer' : ''}`}
                      onClick={() => canManagePerms && setPermsMember(m)}
                    >
                      <div className="font-semibold text-brand-900 dark:text-brand-100 text-sm truncate flex items-center gap-1.5">
                        {m.full_name}
                        {canManagePerms && (
                          <UserCog size={12} className="text-brand-300 dark:text-brand-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-brand-400 font-mono">{m.phone}</div>
                    </div>

                    {/* Role change — only for president/admin */}
                    {canManagePerms && (
                      busy === m.id ? (
                        <Loader2 size={14} className="animate-spin text-brand-400 shrink-0" />
                      ) : (
                        <select
                          value={m.role}
                          onChange={e => changeRole(m.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="text-xs border border-brand-200 dark:border-brand-700 rounded-lg px-2 py-1 bg-white dark:bg-brand-900 text-brand-800 dark:text-brand-200 focus:outline-none focus:ring-2 focus:ring-gold-400 shrink-0"
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

        {/* Individual permissions legend */}
        <div className="mt-4 pt-4 border-t border-brand-100 dark:border-brand-800">
          <h3 className="font-bold text-brand-950 dark:text-brand-50 text-sm mb-3 flex items-center gap-2">
            <ShieldPlus size={14} className="text-brand-400" />
            الصلاحيات الفردية المتاحة
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {INDIVIDUAL_PERMS.map(p => (
              <div key={p.key} className="flex flex-col gap-0.5 bg-brand-50 dark:bg-brand-800/50 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-brand-800 dark:text-brand-200">{p.label}</span>
                <span className="text-[11px] text-brand-500 dark:text-brand-400">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-member permissions modal */}
      {permsMember && (
        <PermissionsModal
          member={permsMember}
          onClose={() => setPermsMember(null)}
        />
      )}
    </div>
  )
}
