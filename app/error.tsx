'use client'
import { useEffect } from 'react'

/** Catches client-side errors within the root layout. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ClientError]', error?.message, error?.stack)
  }, [error])

  return (
    <div style={{ padding: 32, fontFamily: 'Arial', direction: 'rtl', maxWidth: 600, margin: '40px auto' }}>
      <h2 style={{ color: '#0b2135', marginBottom: 12 }}>حدث خطأ في التطبيق</h2>
      <p style={{ color: '#c00', background: '#fff0f0', padding: '12px 16px', borderRadius: 8, fontSize: 14 }}>
        {error?.message || 'خطأ غير معروف'}
      </p>
      {error?.digest && (
        <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>Digest: {error.digest}</p>
      )}
      <details style={{ marginTop: 16, fontSize: 12, color: '#555' }}>
        <summary style={{ cursor: 'pointer' }}>تفاصيل (Stack Trace)</summary>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 12, borderRadius: 8, marginTop: 8, overflow: 'auto' }}>
          {error?.stack}
        </pre>
      </details>
      <button onClick={reset} style={{ marginTop: 20, padding: '10px 24px', background: '#0b2135', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
        إعادة المحاولة
      </button>
    </div>
  )
}
