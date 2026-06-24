import Link from 'next/link';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';

const POSTS = [
  {
    tag: 'Protocol',
    date: 'Apr 28, 2026',
    title: 'How FHE Changes Trade Credit Insurance Forever',
    excerpt:
      'Traditional trade credit insurance exposes sensitive financial data to brokers, underwriters, and adjusters at every step. Fully Homomorphic Encryption closes that gap — risk evaluation happens on encrypted values, with no plaintext ever visible on-chain.',
    readTime: '6 min read',
  },
  {
    tag: 'Education',
    date: 'Apr 14, 2026',
    title: 'What is Trade Credit Insurance and Why Do SMEs Need It?',
    excerpt:
      "If you sell goods or services on credit terms — 30, 60, or 90 days — you carry buyer default risk every day. Trade credit insurance transfers that risk so you get paid whether or not your buyer does. Here's how it works and why on-chain changes everything.",
    readTime: '5 min read',
  },
  {
    tag: 'Deep Dive',
    date: 'Mar 31, 2026',
    title: 'Arbitrum, Escrows, and the Future of Invoice Finance',
    excerpt:
      'Invoice finance is a multi-trillion dollar market running on paper, email, and trust. ReineiraOS brings confidential settlement infrastructure to this market — programmable escrows that release automatically when payment conditions are met, secured by FHE.',
    readTime: '8 min read',
  },
]

export function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>

        <section className="border-b border-[hsl(var(--ds-line-light))] bg-[hsl(var(--ds-surface-section))] px-4 pb-20 pt-[120px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--ds-teal-600))]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--ds-teal-600))]">
                Prova Blog
              </span>
            </div>
            <h1 className="max-w-2xl text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[1.04] tracking-tight text-[hsl(var(--ds-ink-900))]">
              Trade finance,<br />explained.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-[hsl(var(--ds-ink-600))]">
              Protocol deep dives, product updates, and practical guides for sellers,
              liquidity providers, and DeFi builders.
            </p>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {POSTS.map((post) => (
                <article
                  key={post.title}
                  className="group flex flex-col rounded-2xl border border-[hsl(var(--ds-line-light))] bg-[hsl(var(--ds-surface-section))] p-8 transition-shadow hover:shadow-md"
                >
                  <div className="mb-6 flex items-center gap-3">
                    <span className="rounded-full border border-[hsl(var(--ds-line-strong))] px-3 py-1 text-xs font-semibold text-[hsl(var(--ds-ink-600))]">
                      {post.tag}
                    </span>
                    <span className="text-xs text-[hsl(var(--ds-ink-400))]">{post.date}</span>
                  </div>
                  <h2 className="mb-3 text-xl font-black leading-snug tracking-tight text-[hsl(var(--ds-ink-900))]">
                    {post.title}
                  </h2>
                  <p className="flex-1 text-sm leading-relaxed text-[hsl(var(--ds-ink-600))]">
                    {post.excerpt}
                  </p>
                  <div className="mt-6 flex items-center justify-between border-t border-[hsl(var(--ds-line-light))] pt-5">
                    <span className="text-xs text-[hsl(var(--ds-ink-400))]">{post.readTime}</span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--ds-teal-600))]">
                      Coming soon
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[hsl(var(--ds-surface-section))] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <div className="mb-6 flex items-center justify-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--ds-teal-600))]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--ds-teal-600))]">Stay updated</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-[hsl(var(--ds-ink-900))]">
              Follow us for updates.
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-base text-[hsl(var(--ds-ink-600))]">
              Protocol announcements, new posts, and product updates are posted first on X.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <a
                href="https://x.com/Prova_TCI"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--ds-ink-900))] px-8 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80 sm:w-auto"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Follow @Prova_TCI
              </a>
              <Link
                href="/auth"
                className="flex w-full items-center justify-center rounded-full border border-[hsl(var(--ds-line-strong))] px-8 py-3 text-sm font-semibold text-[hsl(var(--ds-ink-400))] transition-colors hover:border-[hsl(var(--ds-teal-600)/0.4)] hover:text-[hsl(var(--ds-ink-900))] sm:w-auto"
              >
                Try the platform
              </Link>
            </div>
          </div>
        </section>

      </main>
      <LandingFooter />
    </div>
  );
}
