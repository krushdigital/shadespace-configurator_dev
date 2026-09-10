import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';

interface AdminLoginProps {
  onLogin: () => void;
  message?: string | null;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, message }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailMode, setEmailMode] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/admin/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthError) setError(oauthError.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OAuth failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError('Invalid email or password');
        return;
      }
      onLogin();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-forest-900 mb-2">ShadeSpace Admin</h1>
          <p className="text-gray-600">Sign in with your authorised account</p>
        </div>

        {message && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm mb-4">
            {message}
          </div>
        )}

        <Button onClick={handleGoogle} disabled={loading} className="w-full mb-3 flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16 4 9 8.7 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.9-5.3l-6.4-5.4c-2 1.5-4.7 2.7-7.5 2.7-5.2 0-9.6-3.3-11.2-8l-6.5 5C9 39.3 16 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.4 5.4C41.9 35 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"/>
          </svg>
          {loading ? 'Opening Google...' : 'Continue with Google'}
        </Button>

        <button
          onClick={() => setEmailMode(m => !m)}
          className="text-xs text-gray-500 hover:text-gray-700 w-full text-center mb-2"
        >
          {emailMode ? 'Hide email sign-in' : 'Sign in with email instead'}
        </button>

        {emailMode && (
          <form onSubmit={handleEmail} className="space-y-4 mt-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@shadespace.com" required autoComplete="email" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" />
            </div>
            <Button type="submit" disabled={loading || !email || !password} className="w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mt-4">
            {error}
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Access is invitation-only. If you need access, contact a super admin.</p>
        </div>
      </Card>
    </div>
  );
};
