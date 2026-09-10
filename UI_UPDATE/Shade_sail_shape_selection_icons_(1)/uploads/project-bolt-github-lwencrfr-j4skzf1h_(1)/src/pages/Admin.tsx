import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { supabase } from '../lib/supabase';
import { useAdminProfile } from '../hooks/useAdminProfile';

export const Admin: React.FC = () => {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [callbackMessage, setCallbackMessage] = useState<string | null>(null);
  const { loading: profileLoading, profile, unauthorised } = useAdminProfile();

  useEffect(() => {
    if (window.location.pathname === '/admin/callback') {
      window.history.replaceState({}, '', '/admin');
    }
    supabase.auth.getSession().then(({ data: { session } }) => setHasSession(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (hasSession && !profileLoading && unauthorised) {
      setCallbackMessage('This account is not authorised for the admin dashboard. Ask a super admin to invite you.');
      supabase.auth.signOut();
    }
  }, [hasSession, profileLoading, unauthorised]);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    setHasSession(false);
  };

  if (hasSession === null || (hasSession && profileLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!hasSession || !profile) {
    return <AdminLogin onLogin={() => {}} message={callbackMessage} />;
  }

  return <AdminDashboard onLogout={handleLogout} profile={profile} />;
};
