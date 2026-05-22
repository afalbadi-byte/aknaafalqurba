'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, User, CreditCard, FileHeart, Newspaper,
  Users, Banknote, Settings as SettingsIcon, Menu, X, LogOut, Bell, Shield,
  Sun, Moon, Monitor, Database, ClipboardList,
} from 'lucide-react'
import Logo from './logo'
import { api } from '@/lib/api-client'
import { ROLE_LABELS, relativeTime } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

type User = {
  id: number; full_name: string; phone: string; email: string | null
  branch: string | null; role: string; status: string; avatar: string | null
  theme: Theme
}

const MEMBER_NAV = [
  { to: '/dashboard',  label: 'الرئيسية',         icon: LayoutDashboard },
  { to: '/payments',   label: 'دفعاتي',           icon: CreditCard },
  { to: '/aid',        label: 'طلبات المعونات',   icon: FileHeart },
  { to: '/news',       label: 'أخبار العائلة',    icon: Newspaper },
  { to: '/profile',    label: 'بياناتي',          icon: User },
]
const ADMIN_NAV = [
  { to: '/admin',           label: 'لوحة الإدارة',    icon: Shield },
  { to: '/admin/members',   label: 'الأعضاء',         icon: Users },
  { to: '/admin/payments',  label: 'مراجعة الدفعات',  icon: CreditCard },
  { to: '/admin/aid',       label: 'طلبات المعونات',  icon: FileHeart },
  { to: '/admin/expenses',  label: 'المصروفات',       icon: Banknote },
  { to: '/admin/news',      label: 'إدارة الأخبار',   icon: Newspaper },
  { to: '/admin/reports',   label: 'التقارير المالية', icon: LayoutDashboard },
  { to: '/admin/settings',  label: 'الإعدادات',       icon: SettingsIcon },
  { to: '/admin/migrate',   label: 'مهاجرات DB',      icon: Database },
  { to: '/admin/logs',      label: 'سجل النشاط',      icon: ClipboardList },
]
const COMMITTEE = ['admin', 'president', 'treasurer', 'aid_committee']

const THEME_ICONS: Record<Theme, React.ElementType> = { light: Sun, dark: Moon, system: Monitor }
const THEME_CYCLE: Theme[] = ['light', 'dark', 'system']

export default function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const router    = useRouter()
  const pathname  = usePathname()
  const isCommittee = COMMITTEE.includes(user.role)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifs,  setNotifs]  = useState<any[]>([])
  const [unread,  setUnread]  = useState(0)
  const [bellOpen,setBellOpen]= useState(false)
  const [theme,   setTheme]   = useState<Theme>(user.theme)

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  async function load() {
    try {
      const r = await api.notifications.mine()
      setNotifs(r.notifications); setUnread(r.unread_count)
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.notifications.readAll()
      setUnread(0); setNotifs(n => n.map(x => ({ ...x, is_read: true })))
    } catch {}
  }

  async function openBell() {
    setBellOpen(o => !o)
    // Auto-mark all as read when opening the bell
    if (!bellOpen && unread > 0) {
      try {
        await api.notifications.readAll()
        setUnread(0); setNotifs(n => n.map(x => ({ ...x, is_read: true })))
      } catch {}
    }
  }

  async function handleLogout() {
    await api.auth.logout()
    router.push('/login')
    router.refresh()
  }

  async function cycleTheme() {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]
    setTheme(next)
    // Apply immediately to DOM
    const root = document.documentElement
    if (next === 'dark')  root.classList.add('dark')
    else if (next === 'light') root.classList.remove('dark')
    else root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
    // Persist to server (fire and forget)
    try { await api.members.setTheme(next) } catch {}
  }

  const ThemeIcon = THEME_ICONS[theme]
  const themeLabel: Record<Theme, string> = { light: 'فاتح', dark: 'داكن', system: 'تلقائي' }

  const items = isCommittee
    ? [...MEMBER_NAV, { separator: true } as any, ...ADMIN_NAV]
    : MEMBER_NAV

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-white dark:bg-brand-950 border-b border-brand-100 dark:border-brand-800 sticky top-0 z-30 shadow-sm dark:shadow-brand-900/50">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -m-2 text-brand-700 dark:text-brand-300">
              <Menu size={22} />
            </button>
            <Link href="/dashboard"><Logo /></Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme toggle */}
            <button
              onClick={cycleTheme}
              title={`الوضع الحالي: ${themeLabel[theme]}`}
              className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-600 dark:text-brand-300 transition"
            >
              <ThemeIcon size={18} />
            </button>

            {/* Bell */}
            <div className="relative">
              <button onClick={openBell} className="relative p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-800 text-brand-700 dark:text-brand-300">
                <Bell size={20} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gold-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-brand-900 rounded-xl shadow-card dark:shadow-brand-950/60 border border-brand-100 dark:border-brand-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-brand-100 dark:border-brand-700 flex items-center justify-between">
                    <span className="font-bold text-brand-950 dark:text-brand-50 text-sm">الإشعارات</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                        تعليم الكل كمقروء
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifs.length === 0 && <div className="p-6 text-center text-sm text-brand-500">لا توجد إشعارات</div>}
                    {notifs.map(n => (
                      <Link key={n.id} href={n.link || '#'}
                        onClick={() => setBellOpen(false)}
                        className={`block px-4 py-3 border-b border-brand-50 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-800 ${!n.is_read ? 'bg-gold-50/40 dark:bg-gold-900/10' : ''}`}>
                        <div className="text-sm font-semibold text-brand-950 dark:text-brand-50">{n.title}</div>
                        {n.body && <div className="text-xs text-brand-600 dark:text-brand-400 mt-0.5 line-clamp-2">{n.body}</div>}
                        <div className="text-[11px] text-brand-400 mt-1">{relativeTime(n.created_at)}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-brand-100 dark:border-brand-700 mr-1">
              <div className="text-right leading-tight">
                <div className="text-sm font-bold text-brand-950 dark:text-brand-50">{user.full_name}</div>
                <div className="text-[11px] text-brand-500 dark:text-brand-400">{ROLE_LABELS[user.role]}</div>
              </div>
              <Avatar name={user.full_name} src={user.avatar} size={36} />
            </div>
            <button onClick={handleLogout} className="btn-ghost !p-2" title="تسجيل الخروج">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 bg-white dark:bg-brand-950 border-l border-brand-100 dark:border-brand-800 flex-col">
          <nav className="p-4 flex-1 overflow-y-auto">
            {items.map((it: any, i: number) =>
              it.separator ? (
                <div key={i} className="my-3 px-3 text-[11px] uppercase tracking-wider text-brand-400 dark:text-brand-500 font-bold border-t border-brand-100 dark:border-brand-800 pt-3">
                  لوحة الإدارة
                </div>
              ) : (
                <NavItem key={it.to} {...it} pathname={pathname} />
              )
            )}
          </nav>
          <div className="p-4 border-t border-brand-100 dark:border-brand-800 text-[11px] text-brand-400 dark:text-brand-600 text-center">
            © {new Date().getFullYear()} عائلة البادي
          </div>
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-brand-950 shadow-2xl flex flex-col">
              <div className="p-4 flex items-center justify-between border-b border-brand-100 dark:border-brand-800">
                <Logo size={36} />
                <button onClick={() => setMobileOpen(false)} className="p-2 text-brand-700 dark:text-brand-300"><X size={22} /></button>
              </div>
              <nav className="p-3 flex-1 overflow-y-auto" onClick={() => setMobileOpen(false)}>
                {items.map((it: any, i: number) =>
                  it.separator ? (
                    <div key={i} className="my-3 px-3 text-[11px] uppercase tracking-wider text-brand-400 dark:text-brand-500 font-bold border-t border-brand-100 dark:border-brand-800 pt-3">
                      لوحة الإدارة
                    </div>
                  ) : <NavItem key={it.to} {...it} pathname={pathname} />
                )}
              </nav>
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  )
}

function NavItem({ to, label, icon: Icon, pathname }: any) {
  const active = pathname === to || (to !== '/admin' && pathname.startsWith(to))
  return (
    <Link href={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold mb-1 transition ${
        active
          ? 'bg-brand-950 dark:bg-gold-500 text-white dark:text-brand-950 shadow-soft'
          : 'text-brand-800 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-800'
      }`}>
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  return src ? (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="rounded-full object-cover border border-brand-200 dark:border-brand-700"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-gradient-to-br from-brand-700 to-brand-950 text-white flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {name[0]}
    </div>
  )
}
