import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';

const DEPARTMENTS = [
  {
    name: 'General support',
    description: 'Questions about using the platform, coverage, or your account.',
    email: 'support@getprova.trade',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18.364 5.636a9 9 0 1 1-12.728 0M12 3v9" />
      </svg>
    ),
  },
  {
    name: 'Sales & partnerships',
    description: 'Interested in volume coverage, white-label, or protocol integrations.',
    email: 'sales@getprova.trade',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    name: 'Press & media',
    description: 'Press inquiries, interviews, and media resources.',
    email: 'press@getprova.trade',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6z" />
      </svg>
    ),
  },
  {
    name: 'Security',
    description: 'Responsible disclosure of vulnerabilities in the protocol or platform.',
    email: 'security@getprova.trade',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

const SOCIAL = [
  {
    label: 'X / Twitter',
    handle: '@Prova_TCI',
    href: 'https://x.com/Prova_TCI',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Discord',
    handle: 'Coming soon',
    href: '#',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.052a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
];

export function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>

        {/* Hero */}
        <section className="border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface-alt))] px-4 pb-20 pt-[120px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex items-center justify-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--brand-primary))]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--brand-primary))]">
                Get in touch
              </span>
            </div>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black tracking-tight text-[hsl(var(--text-primary))]">
              We'd love to hear from you.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-[hsl(var(--text-secondary))]">
              Whether you have a question about coverage, want to explore a partnership,
              or need to report a security issue — we're here.
            </p>
          </div>
        </section>

        {/* Departments */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">Departments</p>
              <h2 className="text-3xl font-black tracking-tight text-[hsl(var(--text-primary))]">Find the right team.</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {DEPARTMENTS.map((dept) => (
                <a
                  key={dept.name}
                  href={`mailto:${dept.email}`}
                  className="group flex flex-col rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-alt))] p-7 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--brand-primary-light))] text-[hsl(var(--brand-primary))]">
                    {dept.icon}
                  </div>
                  <h3 className="mb-2 text-base font-black text-[hsl(var(--text-primary))]">{dept.name}</h3>
                  <p className="mb-5 text-sm leading-relaxed text-[hsl(var(--text-secondary))]">{dept.description}</p>
                  <span className="mt-auto flex items-center gap-2 text-sm font-medium text-[hsl(var(--brand-primary))] transition-colors group-hover:underline underline-offset-2">
                    {dept.email}
                    <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Book a call */}
        <section className="bg-[hsl(var(--bg-surface-alt))] py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start gap-10 rounded-2xl border border-[hsl(var(--border-default))] bg-white p-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">30-minute call</p>
                <h2 className="text-3xl font-black tracking-tight text-[hsl(var(--text-primary))]">
                  Talk to a founder directly.
                </h2>
                <p className="max-w-md text-base text-[hsl(var(--text-secondary))]">
                  If you're evaluating Prova for your business, want to discuss a partnership,
                  or are an investor — book a call and we'll get back to you same day.
                </p>
              </div>
              <a
                href="https://cal.com/jamiu-damilola-alade-zgtrvz/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-2 rounded-full bg-[hsl(var(--brand-primary))] px-8 py-3.5 text-sm font-bold text-[hsl(var(--text-on-brand))] shadow-md shadow-[hsl(var(--brand-primary)/0.2)] transition-colors hover:bg-[hsl(var(--brand-primary-hover))]"
              >
                Schedule a call
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* Social */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">Follow along</p>
              <h2 className="text-3xl font-black tracking-tight text-[hsl(var(--text-primary))]">Stay in the loop.</h2>
            </div>
            <div className="flex flex-wrap gap-4">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-alt))] px-6 py-4 text-sm transition-shadow hover:shadow-md"
                >
                  <span className="text-[hsl(var(--text-secondary))]">{s.icon}</span>
                  <div>
                    <p className="font-bold text-[hsl(var(--text-primary))]">{s.label}</p>
                    <p className="text-xs text-[hsl(var(--text-muted))]">{s.handle}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

      </main>
      <LandingFooter />
    </div>
  );
}
