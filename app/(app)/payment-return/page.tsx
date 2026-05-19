'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import Logo from '@/components/logo'

export default function PaymentReturn() {
  const params = useSearchParams()
  const pid = Number(params.get('pid'))
  const [state, setState] = useState<'checking' | 'approved' | 'rejected' | 'pending' | 'error'>('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pid) { setState('error'); setError('رابط غير صالح'); return }
    let cancelled = false
    let attempts = 0
    async function check() {
      attempts++
      try {
        const r = await api.gateway.verify(pid)
        if (cancelled) return
        if (r.status === 'approved')      setState('approved')
        else if (r.status === 'rejected') setState('rejected')
        else if (attempts < 4)            setTimeout(check, 1500)
        else                              setState('pending')
      } catch (e: any) {
        if (cancelled) return
        setState('error'); setError(e.message)
      }
    }
    check()
    return () => { cancelled = true }
  }, [pid])

  const screens = {
    checking: { icon: <Loader2 className="animate-spin text-brand-500" size={56} />,
      title: 'جاري التحقق من الدفع...', body: 'يرجى الانتظار، لا تغلق هذه الصفحة.' },
    approved: { icon: <CheckCircle2 className="text-emerald-600" size={56} />,
      title: 'تم استلام دفعتك بنجاح', body: 'شكراً لك على مساهمتك في صندوق العائلة.',
      cta: { to: '/payments', label: 'عرض دفعاتي' } },
    rejected: { icon: <XCircle className="text-red-600" size={56} />,
      title: 'لم يكتمل الدفع', body: 'لم تتم عملية الدفع. يمكنك المحاولة مجدداً.',
      cta: { to: '/payments/new', label: 'محاولة جديدة' } },
    pending:  { icon: <Clock className="text-amber-600" size={56} />,
      title: 'دفعتك قيد المعالجة', body: 'ستظهر النتيجة في صفحة دفعاتك خلال دقائق.',
      cta: { to: '/payments', label: 'عرض دفعاتي' } },
    error:    { icon: <XCircle className="text-red-600" size={56} />,
      title: 'تعذّر التحقق من الدفع', body: error || 'حدث خطأ غير متوقع.',
      cta: { to: '/payments', label: 'العودة لدفعاتي' } },
  } as const

  const s = screens[state]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 with-watermark">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-6"><Logo size={56} /></Link>
        <div className="card card-body text-center py-10">
          <div className="flex justify-center mb-5">{s.icon}</div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950 mb-2">{s.title}</h1>
          <p className="text-brand-600 mb-6">{s.body}</p>
          {'cta' in s && <Link href={s.cta.to} className="btn-primary inline-flex">{s.cta.label}</Link>}
        </div>
      </div>
    </div>
  )
}
