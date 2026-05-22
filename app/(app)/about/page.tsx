'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { Shield, Phone, Mail, Hash, CalendarDays, BookOpen, Users } from 'lucide-react'

export default function AboutPage() {
  const [s, setS] = useState<any>(null)

  useEffect(() => {
    api.settings.publicGet().then(r => setS(r.settings || {}))
  }, [])

  if (!s) return <div className="text-center text-brand-500 py-12">جاري التحميل...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">من نحن</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">التعريف بصندوق {s.fund_name || 'أكناف القربى'}</p>
      </header>

      {/* Identity */}
      <div className="card card-body space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-brand-100 dark:border-brand-800">
          <div className="w-10 h-10 rounded-xl bg-brand-950 dark:bg-gold-500 flex items-center justify-center shrink-0">
            <Users size={20} className="text-white dark:text-brand-950" />
          </div>
          <div>
            <h2 className="font-bold text-brand-950 dark:text-brand-50 text-lg">{s.fund_name || 'صندوق أكناف القربى'}</h2>
            {s.family_name && <p className="text-sm text-brand-500 dark:text-brand-400">عائلة {s.family_name}</p>}
          </div>
        </div>

        {s.about && (
          <p className="text-brand-700 dark:text-brand-300 leading-relaxed text-sm whitespace-pre-line">{s.about}</p>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {s.founded_year && (
            <InfoRow icon={CalendarDays} label="سنة التأسيس" value={s.founded_year} />
          )}
          {s.license_number && (
            <InfoRow icon={Hash} label="رقم الترخيص" value={s.license_number} />
          )}
          {s.license_date && (
            <InfoRow icon={CalendarDays} label="تاريخ الترخيص" value={s.license_date} />
          )}
          {s.phone && (
            <InfoRow icon={Phone} label="الجوال" value={s.phone} />
          )}
          {s.email && (
            <InfoRow icon={Mail} label="البريد الإلكتروني" value={s.email} />
          )}
        </div>
      </div>

      {/* License image */}
      {s.license_image && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-brand-100 dark:border-brand-800 flex items-center gap-2">
            <Shield size={16} className="text-brand-400" />
            <h2 className="font-bold text-brand-950 dark:text-brand-50">الترخيص الرسمي</h2>
          </div>
          <div className="p-5 flex justify-center">
            <img
              src={s.license_image}
              alt="صورة الترخيص الرسمي"
              className="max-h-[500px] w-auto rounded-xl border border-brand-200 dark:border-brand-700 shadow-sm object-contain"
            />
          </div>
          <div className="px-5 pb-4 flex justify-center">
            <a
              href={s.license_image}
              download="license.jpg"
              className="btn-secondary text-xs"
            >
              تحميل صورة الترخيص
            </a>
          </div>
        </div>
      )}

      {/* Family regulations */}
      {s.regulations && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-brand-100 dark:border-brand-800 flex items-center gap-2">
            <BookOpen size={16} className="text-brand-400" />
            <h2 className="font-bold text-brand-950 dark:text-brand-50">اللائحة الخاصة بالعائلة</h2>
          </div>
          <div className="p-5">
            <div className="bg-brand-50 dark:bg-brand-800/50 rounded-xl p-5 text-sm text-brand-700 dark:text-brand-300 leading-loose whitespace-pre-line font-mono text-right">
              {s.regulations}
            </div>
          </div>
        </div>
      )}

      {!s.license_image && !s.regulations && (
        <div className="card card-body text-center text-brand-500 dark:text-brand-400 text-sm py-8">
          لم يتم إضافة محتوى صورة الترخيص أو اللائحة بعد.
          <br />
          <span className="text-xs mt-1 block">يمكن للمدير إضافتها من إعدادات الصندوق</span>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-brand-50 dark:bg-brand-800/50 rounded-lg px-4 py-3">
      <Icon size={16} className="text-brand-400 shrink-0" />
      <div>
        <div className="text-xs text-brand-500 dark:text-brand-400">{label}</div>
        <div className="font-semibold text-brand-900 dark:text-brand-100 text-sm">{value}</div>
      </div>
    </div>
  )
}
