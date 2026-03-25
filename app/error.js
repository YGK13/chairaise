'use client';
// ============================================================
// ChaiRaise — Global Error Boundary
// Catches runtime errors and shows recovery UI
// ============================================================

export default function Error({ error, reset }) {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#09090b', color: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        background: '#18181b', border: '1px solid #27272a', borderRadius: 12,
        padding: 40, maxWidth: 440, textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, background: '#ef4444', borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, margin: '0 auto 16px',
        }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 20, lineHeight: 1.6 }}>
          ChaiRaise encountered an unexpected error. Your data is safe — this is a display issue.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: '#f59e0b', color: '#09090b', fontWeight: 700,
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/auth/signin'}
            style={{
              padding: '10px 24px', borderRadius: 8, border: '1px solid #3f3f46',
              background: 'transparent', color: '#fafafa', fontWeight: 600,
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Sign In Again
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && error?.message && (
          <details style={{ marginTop: 20, textAlign: 'left' }}>
            <summary style={{ fontSize: 11, color: '#71717a', cursor: 'pointer' }}>Error details</summary>
            <pre style={{
              fontSize: 10, color: '#ef4444', background: '#09090b',
              padding: 12, borderRadius: 6, marginTop: 8, overflow: 'auto',
              maxHeight: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>{error.message}{'\n'}{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
