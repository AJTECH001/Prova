import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using the Prova platform at getprova.trade (the "Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Platform.

We reserve the right to update these Terms at any time. Continued use of the Platform after any changes constitutes your acceptance of the updated Terms.`,
  },
  {
    title: '2. Description of Service',
    body: `Prova provides a non-custodial on-chain trade credit insurance platform built on the Arbitrum network using the ReineiraOS settlement protocol. The Platform allows:

• Sellers to create invoice escrows and purchase coverage from insurance pools
• Liquidity providers to stake USDC into insurance pools and earn premium yield
• Underwriters to evaluate buyer credit risk using FHE-encrypted scoring

Prova is a software interface to underlying smart contracts. We do not take custody of funds, issue regulated insurance products, or act as a financial intermediary.`,
  },
  {
    title: '3. Eligibility',
    body: `You must be at least 18 years of age to use the Platform. By using the Platform, you represent and warrant that:

• You are not located in, incorporated in, or a resident of the United States of America
• You are not located in any jurisdiction subject to comprehensive sanctions by the UN, EU, UK, or US (including but not limited to Iran, North Korea, Russia, Belarus, Cuba, and Syria)
• Your use of the Platform does not violate any applicable law in your jurisdiction
• You are not using the Platform on behalf of any sanctioned individual or entity

Prova reserves the right to restrict access to any jurisdiction at any time.`,
  },
  {
    title: '4. Non-Custodial Nature',
    body: `Prova is a non-custodial protocol. At no point does Prova, the Prova Protocol Foundation, or any affiliated entity take custody of your funds. All assets are held in smart contracts on the Arbitrum blockchain.

Your account is a ZeroDev ERC-4337 smart account secured by a passkey on your device. You are solely responsible for maintaining access to your passkey and wallet. Lost access cannot be recovered by Prova.`,
  },
  {
    title: '5. Smart Contract Risk',
    body: `The Platform interacts with smart contracts that may contain bugs, vulnerabilities, or behave unexpectedly. By using the Platform, you acknowledge and accept:

• Smart contracts may be subject to exploits, hacks, or unforeseen failures
• Transactions on the blockchain are irreversible
• The FHE encryption layer relies on third-party infrastructure (Fhenix CoFHE) that may be unavailable or have its own bugs
• Prova does not guarantee that any escrow will be settled, any claim will be paid out, or any insurance pool will remain solvent

You should not use the Platform with funds you cannot afford to lose.`,
  },
  {
    title: '6. Insurance Disclaimer',
    body: `The coverage provided through the Prova Platform is facilitated by on-chain smart contracts and is not regulated insurance in any traditional legal sense. Prova is not a licensed insurance company, broker, or underwriter.

The insurance pools are funded by third-party liquidity providers and may become insolvent if claims exceed available capital. Prova makes no guarantee of payout. Coverage terms are determined by smart contract logic and FHE-encrypted underwriting, not by human review.`,
  },
  {
    title: '7. Prohibited Conduct',
    body: `You agree not to use the Platform to:

• Launder money or engage in any other illegal financial activity
• Circumvent sanctions or KYC/AML requirements
• Manipulate insurance pools through wash trading or other means
• Attempt to exploit, hack, or disrupt the smart contracts or the Platform
• Impersonate any person or entity
• Access the Platform using automated tools in ways that could harm infrastructure

Violation of these prohibitions may result in immediate suspension of access and reporting to relevant authorities.`,
  },
  {
    title: '8. Fees',
    body: `Coverage premiums are charged on a per-invoice basis and are determined by the on-chain underwriting contract. The premium rate is disclosed before you confirm any transaction. By confirming a transaction, you agree to the fee displayed.

Prova reserves the right to introduce, modify, or remove platform fees at any time with reasonable notice. Gas fees on the Arbitrum network may also apply, although Prova sponsors gas for standard user operations via account abstraction.`,
  },
  {
    title: '9. Intellectual Property',
    body: `The Prova platform interface, branding, and documentation are owned by or licensed to Prova. The underlying smart contracts and SDK are open source and subject to their respective licences.

You may not reproduce, distribute, or create derivative works of Prova's proprietary content without written permission.`,
  },
  {
    title: '10. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, Prova, its founders, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:

• Loss of funds due to smart contract failure or exploit
• Loss of access to your wallet or passkey
• Failure of an insurance pool to pay out a claim
• Downtime or unavailability of the Platform

Our total aggregate liability shall not exceed the greater of (a) the amount of coverage premiums you paid in the 90 days before the claim or (b) USD 100.`,
  },
  {
    title: '11. Governing Law',
    body: `These Terms shall be governed by and construed in accordance with the laws of the British Virgin Islands, without regard to its conflict of law principles. Any dispute arising under these Terms shall be resolved by binding arbitration under the LCIA rules.`,
  },
  {
    title: '12. Contact',
    body: `For questions about these Terms, contact us at:

Email: legal@getprova.trade
Platform: getprova.trade/contact`,
  },
];

export function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="mt-4 text-sm text-[hsl(var(--text-muted))]">
              Last updated: 1 May 2026
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">

            {/* Risk banner */}
            <div className="mb-12 rounded-2xl border border-[hsl(var(--warning-border))] bg-[hsl(var(--warning-bg))] p-6">
              <p className="text-sm font-semibold text-[hsl(var(--warning-text))]">
                Important risk notice
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--warning-text))]">
                Prova interacts with experimental smart contracts on a public blockchain. Funds may be lost due to bugs, exploits, or pool insolvency. Do not use funds you cannot afford to lose.
              </p>
            </div>

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
              <p className="font-semibold text-[hsl(var(--text-primary))]">Legal questions?</p>
              <p className="mt-2">
                Email us at{' '}
                <a href="mailto:legal@getprova.trade" className="font-medium text-[hsl(var(--brand-primary))] hover:underline underline-offset-2">
                  legal@getprova.trade
                </a>
                .
              </p>
            </div>
          </div>
        </section>

      </main>
      <LandingFooter />
    </div>
  );
}
