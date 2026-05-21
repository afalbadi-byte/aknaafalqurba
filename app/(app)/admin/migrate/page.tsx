'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Loader2, Play } from 'lucide-react'

type MigrationStatus = { name: string; status: 'applied' | 'pending' | 'unknown' }
type RunResult = { applied: string[]; skipped: string[]; errors: { name: string; error: string }[] }

export default function MigratePage() {
  const [status,  setStatus]  = useState<MigrationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState<RunResult | null>(null)
  const [error,   setError]   = useState('')

  useEffect(() => { check() }, [])

  async function check() {
    setLoading(true)
    try {
      const r = await fetch('/api/migrate')
      const d = await r.json()
      setStatus(d.migrations || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function run() {
    setRunning(true); setResult(null); setError('')
    try {
      const r = await fetch('/api/migrate', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) { setError(d.message || 'خطأ في تطبيق المهاجرات'); return }
      setResult(d)
      await check()
    } catch (e: any) { setError(e.message) }
    finally { setRunning(false) }
  }

  const allApplied = status.length > 0 && status.every(m => m.status === 'applied')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">مهاجرات قاعدة البيانات</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">تطبيق تحديثات البنية على قاعدة البيانات</p>
      </header>

      <div className="card card-body space-y-4">
        {loading && <div className="flex items-center gap-2 text-brand-500"><Loader2 className="animate-spin" size={18} /> جاري التحقق...</div>}

        {!loading && status.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-bold text-brand-950 dark:text-brand-50 text-sm mb-3">حالة المهاجرات</h3>
            {status.map(m => (
              <div key={m.name} className="flex items-center justify-between p-3 rounded-lg bg-brand-50 dark:bg-brand-800">
                <span className="font-mono text-sm text-brand-800 dark:text-brand-200">{m.name}</span>
                {m.status === 'applied'
                  ? <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-semibold"><CheckCircle2 size={16}/> مُطبَّق</span>
                  : m.status === 'pending'
                    ? <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm font-semibold"><AlertCircle size={16}/> بانتظار</span>
                    : <span className="text-brand-500 text-sm">غير معروف</span>
                }
              </div>
            ))}
          </div>
        )}

        {allApplied && !result && (
          <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg p-4 text-sm">
            ✅ جميع المهاجرات مُطبَّقة بالفعل. قاعدة البيانات محدّثة.
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 space-y-2">
            <p className="font-bold text-emerald-700 dark:text-emerald-300">✅ تم تطبيق المهاجرات</p>
            {result.applied.length > 0 && <p className="text-sm text-emerald-700 dark:text-emerald-300">مُطبَّقة: {result.applied.join('، ')}</p>}
            {result.skipped.length > 0 && <p className="text-sm text-brand-600 dark:text-brand-400">متخطاة: {result.skipped.join('، ')}</p>}
            {result.errors.length > 0 && (
              <div>
                {result.errors.map(e => (
                  <p key={e.name} className="text-sm text-red-700 dark:text-red-300">{e.name}: {e.error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {!allApplied && (
          <button onClick={run} disabled={running} className="btn-primary">
            {running ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            تطبيق المهاجرات
          </button>
        )}
      </div>

      <div className="card card-body">
        <h3 className="font-bold text-brand-950 dark:text-brand-50 text-sm mb-3">تطبيق يدوي (بديل)</h3>
        <p className="text-xs text-brand-600 dark:text-brand-400 mb-3">
          إذا كان الموقع لا يعمل ولا تستطيع تسجيل الدخول، شغّل هذا SQL مباشرةً في Neon Dashboard:
        </p>
        <pre className="bg-brand-950 text-brand-50 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed direction-ltr text-left">
{`ALTER TABLE members ADD COLUMN IF NOT EXISTS
  email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS
  theme VARCHAR(10) NOT NULL DEFAULT 'system';
CREATE INDEX IF NOT EXISTS idx_members_natid
  ON members(national_id) WHERE national_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  email VARCHAR(150) NOT NULL,
  code_hash VARCHAR(120) NOT NULL,
  purpose VARCHAR(30) NOT NULL DEFAULT 'register',
  attempts SMALLINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_ver_member
  ON email_verifications(member_id);
CREATE INDEX IF NOT EXISTS idx_email_ver_active
  ON email_verifications(member_id, used_at, expires_at);`}
        </pre>
      </div>
    </div>
  )
}
