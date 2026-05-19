import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import AppShell from '@/components/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (user.status !== 'active') redirect('/login?next=/dashboard')

  // Strip non-serializable fields
  const u = {
    id: user.id, full_name: user.full_name, phone: user.phone, email: user.email,
    branch: user.branch, role: user.role, status: user.status,
  }
  // Suspense wrapper required for client pages using useSearchParams (Next.js 15)
  return (
    <AppShell user={u}>
      <Suspense fallback={<div className="text-center text-brand-500 py-12">جاري التحميل...</div>}>
        {children}
      </Suspense>
    </AppShell>
  )
}
