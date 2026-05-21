'use client'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'Arial', background: '#f1f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 600, width: '90%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h1 style={{ color: '#0b2135', marginBottom: 8 }}>حدث خطأ</h1>
          <p style={{ color: '#5d7a99', marginBottom: 16, fontSize: 14 }}>
            {error?.message || 'خطأ غير معروف'}
          </p>
          {error?.digest && (
            <p style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>
              Digest: {error.digest}
            </p>
          )}
          <details style={{ marginBottom: 16, fontSize: 12, color: '#666' }}>
            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>تفاصيل الخطأ</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
              {error?.stack || 'لا توجد تفاصيل'}
            </pre>
          </details>
          <button
            onClick={reset}
            style={{ background: '#0b2135', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  )
}
