import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      await login();
      navigate({ to: '/dashboard' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
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
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 pb-20 pt-[60px] text-center sm:px-6 lg:px-8">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--brand-primary)/0.05)] blur-[140px]" />
      </div>

      {/* Badge */}
      <div className="mb-10 flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-[hsl(var(--brand-primary))]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--brand-primary))]">
          ZK-Shielded Trade Credit · Not Just for Banks
        </span>
      </div>

      {/* Headline */}
      <h1 className="max-w-4xl text-[clamp(3rem,8vw,6.5rem)] font-black leading-[1.02] tracking-tight text-[hsl(var(--text-primary))]">
        Insuring the trade<br />
        of people who<br />
        <span className="text-[hsl(var(--brand-primary))]">hate fine print.</span>
      </h1>

      {/* Subtext */}
      <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-[hsl(var(--text-secondary))]">
        Automated settlement, private risk underwriting, and institutional
        liquidity pools — on-chain.
      </p>

      {/* CTAs */}
      {!showRegister ? (
        <div className="mt-10 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            size="lg"
            loading={loading}
            disabled={loading}
            onClick={handleLogin}
            className="w-full rounded-full bg-[hsl(var(--brand-primary))] px-8 text-[hsl(var(--text-on-brand))] hover:bg-[hsl(var(--brand-primary-hover))] shadow-lg shadow-[hsl(var(--brand-primary)/0.2)] sm:w-auto"
          >
            Start earning
          </Button>
          <a
            href="#demo"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[hsl(var(--border-strong))] px-8 py-2.5 text-sm font-semibold text-[hsl(var(--text-muted))] transition-colors hover:border-[hsl(var(--brand-primary)/0.4)] hover:text-[hsl(var(--text-primary))] sm:w-auto"
          >
            Browse docs
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      ) : (
        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            className="w-full rounded-full border border-[hsl(var(--border-strong))] bg-white px-6 py-3 text-sm text-[hsl(var(--text-primary))] outline-none transition-colors focus:border-[hsl(var(--brand-primary))] placeholder:text-[hsl(var(--text-muted))]"
          />
          <Button
            size="lg"
            loading={loading}
            disabled={loading}
            onClick={handleRegister}
            className="w-full rounded-full bg-[hsl(var(--brand-primary))] px-8 text-[hsl(var(--text-on-brand))] hover:bg-[hsl(var(--brand-primary-hover))]"
          >
            Create Account
          </Button>
        </div>
      )}

      {/* Register / login toggle */}
      <p className="mt-4 text-sm text-[hsl(var(--text-muted))]">
        {showRegister ? (
          <>Already have an account?{' '}
            <button onClick={() => { setShowRegister(false); setError(null); }} className="font-semibold text-[hsl(var(--brand-primary))] hover:underline underline-offset-2">
              Sign in
            </button>
          </>
        ) : (
          <>New to Prova?{' '}
            <button onClick={() => { setShowRegister(true); setError(null); }} className="font-semibold text-[hsl(var(--brand-primary))] hover:underline underline-offset-2">
              Create an account
            </button>
          </>
        )}
      </p>

      {error && <p className="mt-2 text-sm text-[hsl(var(--danger-text))]">{error}</p>}

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-40">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--text-muted))]">Scroll</span>
        <svg className="h-5 w-5 animate-bounce text-[hsl(var(--text-muted))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
}
