'use client';

// ============================================================
// ChaiRaise — Main Entry Point
// NextAuth session → localStorage sync → CRM render
// Redirects to /auth/signin if not authenticated
// ============================================================

import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import CRMApp from '@/components/CRMApp';

function CRMWithAuth() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Loading state — show branded spinner
  if (!mounted || status === "loading") {
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

  // Not authenticated — redirect to sign-in
  if (status === "unauthenticated" || !session?.user) {
    // Check if there's a localStorage session (from previous auth)
    const existingSession = typeof window !== 'undefined' ? localStorage.getItem('crm_session') : null;
    if (!existingSession) {
      window.location.href = "/auth/signin";
      return null;
    }
  }

  // Authenticated — sync NextAuth session to CRM's localStorage
  if (session?.user) {
    const crmSession = {
      id: Date.now(),
      name: session.user.name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email || '',
      role: 'admin',
      avatar: (session.user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      provider: session.user.provider || 'credentials',
      loginAt: new Date().toISOString(),
    };
    localStorage.setItem('crm_session', JSON.stringify(crmSession));
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
