import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';

const SECTIONS = [
  {
    title: '1. Introduction',
    body: `Prova Protocol ("Prova", "we", "us", or "our") operates the trade credit insurance platform available at getprova.trade and its subdomains. This Privacy Policy explains what information we collect, how we use it, and the rights you have over your data.

By accessing or using Prova, you acknowledge that you have read and understood this policy. If you do not agree, please do not use the platform.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect only what is necessary to provide the service:

Wallet address — your Ethereum-compatible wallet address is your identity on Prova. It is public on the blockchain and is used for authentication via Sign-In With Ethereum (SIWE).

Business profile — when you complete KYB onboarding, we collect your company name, country of incorporation, and business registration number. This data is stored in our database and is not shared with third parties except as required by law.

Device and session data — when you visit the platform, we may collect your IP address, browser type, and device identifiers for security and abuse prevention purposes. We do not use this data for advertising.

On-chain activity — all escrow creation, coverage purchases, and settlements occur on the Arbitrum blockchain and are publicly visible. Prova indexes these events to display your transaction history.`,
  },
  {
    title: '3. FHE — What We Never See',
    body: `Financial values processed by Prova's underwriting engine — including credit scores, risk premiums, and coverage amounts — are encrypted using Fully Homomorphic Encryption (FHE) via Fhenix CoFHE before they touch the blockchain. This means:

No plaintext financial data is ever stored on-chain or in our database. The underwriting contract computes directly on encrypted values. Neither Prova nor any third party can read the raw scores or amounts used to price your coverage.

Your buyer's credit history is evaluated privately. No financial data about your counterparty is exposed to you, to us, or to any other party.`,
  },
  {
    title: '4. How We Use Your Information',
    body: `We use the information we collect to:

• Authenticate your wallet and issue access tokens
• Maintain your business profile for compliance purposes
• Display your transaction and coverage history
• Monitor the platform for security threats and abuse
• Comply with applicable laws and regulations
• Respond to your support requests

We do not sell your personal information. We do not use your data for advertising or behavioural profiling.`,
  },
  {
    title: '5. Data Sharing',
    body: `We share your information only in the following circumstances:

Service providers — we use third-party infrastructure providers (cloud hosting, RPC nodes, analytics) who process data on our behalf and are bound by data processing agreements.

Legal requirements — we may disclose information if required by law, court order, or government authority.

Protocol infrastructure — your wallet address and on-chain activity are visible to anyone interacting with the Arbitrum blockchain. This is inherent to public blockchain operation and is not a disclosure by Prova.`,
  },
  {
    title: '6. Data Retention',
    body: `We retain your business profile and KYB data for a minimum of five years from the date of your last transaction, as required by applicable AML/KYC regulations.

Session tokens expire automatically: access tokens after 15 minutes and refresh tokens after 7 days.

You may request deletion of your off-chain account data by contacting us at privacy@getprova.trade. Note that on-chain data (transactions, escrows, coverage records) is permanent and cannot be deleted.`,
  },
  {
    title: '7. Your Rights',
    body: `Depending on your jurisdiction, you may have the right to:

• Access the personal data we hold about you
• Correct inaccurate data
• Request deletion of your off-chain data (subject to legal retention obligations)
• Object to or restrict certain processing
• Receive your data in a portable format

To exercise any of these rights, contact us at privacy@getprova.trade. We will respond within 30 days.`,
  },
  {
    title: '8. Security',
    body: `We implement technical and organisational measures to protect your data, including TLS encryption in transit, encrypted storage for sensitive fields, rate limiting, and role-based access controls.

No system is perfectly secure. If you discover a security vulnerability, please report it responsibly to security@getprova.trade.`,
  },
  {
    title: '9. Cookies',
    body: `We use only essential cookies required for authentication and session management. We do not use tracking cookies, advertising cookies, or third-party analytics cookies that profile individual users.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date at the top of this page and notify users via a banner on the platform. Continued use of the platform after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '11. Contact',
    body: `For privacy-related questions or to exercise your rights, contact us at:

Email: privacy@getprova.trade
Platform: getprova.trade/contact`,
  },
];

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>

        {/* Header */}
        <section className="border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface-alt))] px-4 pb-16 pt-[120px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
              Legal
            </p>
            <h1 className="text-5xl font-black tracking-tight text-[hsl(var(--text-primary))]">
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm text-[hsl(var(--text-muted))]">
              Last updated: 1 May 2026
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="space-y-12">
              {SECTIONS.map((section) => (
                <div key={section.title}>
                  <h2 className="mb-4 text-xl font-black text-[hsl(var(--text-primary))]">
                    {section.title}
                  </h2>
                  <div className="space-y-4">
                    {section.body.split('\n\n').map((para, i) => (
                      <p key={i} className="text-base leading-relaxed text-[hsl(var(--text-secondary))] whitespace-pre-line">
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-alt))] p-8 text-sm text-[hsl(var(--text-secondary))]">
              <p className="font-semibold text-[hsl(var(--text-primary))]">Questions about this policy?</p>
              <p className="mt-2">
                Email us at{' '}
                <a href="mailto:privacy@getprova.trade" className="font-medium text-[hsl(var(--brand-primary))] hover:underline underline-offset-2">
                  privacy@getprova.trade
                </a>
                {' '}and we'll respond within 30 days.
              </p>
            </div>
          </div>
        </section>

      </main>
      <LandingFooter />
    </div>
  );
}
