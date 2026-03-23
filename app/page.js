'use client';

// ============================================================
// ChaiRaise — Main CRM Application (Client Component)
// The full CRM renders here as a client-side React app
// Server-side API routes handle AI calls securely
// ============================================================

import { useEffect, useState } from 'react';
import CRMApp from '@/components/CRMApp';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // Ensure client-side only rendering (localStorage access)
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#09090b', color: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, background: '#f59e0b', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 20, color: '#09090b', margin: '0 auto 16px'
          }}>CR</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>ChaiRaise</div>
          <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>Loading CRM...</div>
        </div>
      </div>
    );
  }

  return <CRMApp />;
}
