import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';

type Mode = 'login' | 'register';

export function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      await login();
      navigate({ to: '/dashboard' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!username.trim()) { setError('Please enter a username'); return; }
    setLoading(true);
    setError(null);
    try {
      await register(username.trim());
      navigate({ to: '/dashboard' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setUsername('');
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10">
      {/* Top-left logo */}
      <div className="absolute left-6 top-6 sm:left-10 sm:top-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <img src="/prova_logo.png" alt="Prova" className="h-7 w-7 rounded-md object-contain transition-transform group-hover:scale-110" />
          <span className="text-base font-black tracking-tighter text-[hsl(var(--text-primary))]">Prova</span>
        </Link>
      </div>

      {/* Centered card */}
      <div className="w-full max-w-sm">
          <div className="mb-8 space-y-1.5">
            <h1 className="text-2xl font-black text-[hsl(var(--text-primary))]">
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </h1>
            <p className="text-sm text-[hsl(var(--text-secondary))]">
              {mode === 'login'
                ? 'Use your passkey to sign in securely.'
                : 'Choose a username and create a passkey.'}
            </p>
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-muted))]">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. john_trade"
                  disabled={loading}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  className="w-full rounded-xl border border-[hsl(var(--border-strong))] bg-white px-4 py-3 text-sm text-[hsl(var(--text-primary))] outline-none transition-colors placeholder:text-[hsl(var(--text-muted))] focus:border-[hsl(var(--brand-primary))] focus:ring-2 focus:ring-[hsl(var(--brand-primary)/0.1)]"
                />
              </div>
            )}

            {/* Passkey button */}
            <button
              onClick={mode === 'login' ? handleLogin : handleRegister}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[hsl(var(--brand-primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--text-on-brand))] shadow-md shadow-[hsl(var(--brand-primary)/0.2)] transition-all hover:bg-[hsl(var(--brand-primary-hover))] disabled:opacity-60"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 11c0-1.1-.9-2-2-2a2 2 0 0 0-2 2c0 .74.4 1.38 1 1.73V15h2v-2.27c.6-.35 1-.99 1-1.73z" />
                  <path d="M17 8h-1V6A4 4 0 0 0 8 6v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2z" />
                </svg>
              )}
              {loading
                ? mode === 'login' ? 'Signing in…' : 'Creating account…'
                : mode === 'login' ? 'Sign in with Passkey' : 'Create account with Passkey'}
            </button>

            {error && (
              <p className="rounded-lg bg-[hsl(var(--danger-bg))] border border-[hsl(var(--danger-border))] px-4 py-3 text-sm text-[hsl(var(--danger-text))]">
                {error}
              </p>
            )}
          </div>

          {/* Mode toggle */}
          <p className="mt-6 text-center text-sm text-[hsl(var(--text-muted))]">
            {mode === 'login' ? (
              <>New to Prova?{' '}
                <button onClick={() => switchMode('register')} className="font-semibold text-[hsl(var(--brand-primary))] hover:underline underline-offset-2">
                  Create account
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="font-semibold text-[hsl(var(--brand-primary))] hover:underline underline-offset-2">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

      {/* Bottom legal */}
      <div className="absolute bottom-6 flex items-center gap-6 text-xs text-[hsl(var(--text-faint))]">
        <span>© 2026 Prova Protocol</span>
        <a href="#" className="hover:text-[hsl(var(--text-primary))]">Privacy</a>
        <a href="#" className="hover:text-[hsl(var(--text-primary))]">Terms</a>
      </div>
    </div>
  );
}
