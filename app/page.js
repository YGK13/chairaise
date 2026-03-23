'use client';

// ============================================================
// ChaiRaise — Main Entry Point
// Checks NextAuth session, falls back to built-in auth
// ============================================================

import { useEffect, useState } from 'react';
import { SessionProvider, useSession, signOut } from 'next-auth/react';
import CRMApp from '@/components/CRMApp';

function CRMWithAuth() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

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
          <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>Loading...</div>
        </div>
      </div>
    );
  }

  // If NextAuth session exists, inject it into CRM's localStorage auth
  // so the CRM's built-in auth system recognizes the user
  if (session?.user) {
    const existing = localStorage.getItem('crm_session');
    if (!existing) {
      const crmSession = {
        id: Date.now(),
        name: session.user.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        role: 'admin', // OAuth users get admin by default (first user)
        avatar: (session.user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        provider: session.user.provider || 'oauth',
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem('crm_session', JSON.stringify(crmSession));
    }
  }

  return <CRMApp />;
}

export default function Home() {
  return (
    <SessionProvider>
      <CRMWithAuth />
    </SessionProvider>
  );
}
