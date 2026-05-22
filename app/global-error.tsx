'use client'
import { useEffect } from 'react'

/** Catches server/root-level errors — replaces the root layout. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error?.message, error?.stack)
  }, [error])

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, padding: 32, fontFamily: 'Arial', background: '#f1f4f8', minHeight: '100vh' }}>
        <div style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: '#0b2135', marginBottom: 12 }}>خطأ في الخادم</h2>
          <p style={{ color: '#c00', background: '#fff0f0', padding: '12px 16px', borderRadius: 8, fontSize: 14 }}>
            {error?.message || 'خطأ غير معروف'}
          </p>
          {error?.digest && (
            <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>Digest: {error.digest}</p>
          )}
          <details style={{ marginTop: 16, fontSize: 12, color: '#555' }}>
            <summary style={{ cursor: 'pointer' }}>Stack Trace</summary>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 12, borderRadius: 8, marginTop: 8, overflow: 'auto' }}>
              {error?.stack}
            </pre>
          </details>
          <button onClick={reset} style={{ marginTop: 20, padding: '10px 24px', background: '#0b2135', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  )
}
