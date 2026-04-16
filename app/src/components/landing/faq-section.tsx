import { useState } from 'react';

const FAQS = [
  {
    question: 'What is Prova and who is it for?',
    answer:
      'Prova is an on-chain trade credit insurance protocol built on Arbitrum. It serves SME exporters who need protection against buyer default on invoices ($5K–$50K), underwriters who want programmable on-chain risk books, and liquidity providers who want USDC yield backed by real trade finance assets.',
  },
  {
    question: 'How does FHE-encrypted underwriting work?',
    answer:
      'Prova uses Fully Homomorphic Encryption (FHE) via Fhenix CoFHE. Your credit score is encrypted before it touches the blockchain. The underwriter policy computes directly on the encrypted value — without ever decrypting it — and returns an encrypted risk score that determines your premium. No plaintext financial data is stored or exposed on-chain.',
  },
  {
    question: 'What happens when a buyer defaults?',
    answer:
      'When an invoice passes its due date unpaid, a 7-day waiting period begins. After that window, the escrow condition is met and your coverage triggers automatically. The claim payout is settled from the InsurancePool directly to your wallet — no adjuster, no paperwork, no manual review.',
  },
  {
    question: 'Is Prova non-custodial?',
    answer:
      'Yes. Buyer USDC is held inside audited ConfidentialEscrow smart contracts on Arbitrum. Neither Prova nor the underlying Reineira infrastructure ever takes custody of your funds. Your account is a ZeroDev passkey smart account — tied to your device, not a seed phrase.',
  },
  {
    question: 'How do liquidity providers earn yield?',
    answer:
      'LPs deposit USDC into the InsurancePool. Their capital backs active trade credit policies and earns a proportional share of premiums collected. Exposure is automatically diversified across all active policies. Deposits are non-custodial and withdrawable at any time subject to pool liquidity.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-16 text-center space-y-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
            Got questions?
          </p>
          <h2 className="text-5xl font-black tracking-tight text-[hsl(var(--text-primary))] sm:text-6xl">
            Frequently asked.
          </h2>
          <p className="mx-auto max-w-xl text-lg text-[hsl(var(--text-secondary))]">
            Everything you need to know about how Prova works, who it is for,
            and how your funds are protected.
          </p>
        </div>

        {/* Accordion */}
        <div className="mx-auto max-w-3xl divide-y divide-[hsl(var(--border-subtle))] border-t border-[hsl(var(--border-subtle))]">
          {FAQS.map((faq, i) => (
            <div key={i} className="py-7">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-8 text-left"
              >
                <span className="text-lg font-bold text-[hsl(var(--text-primary))]">
                  {faq.question}
                </span>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${openIndex === i ? 'border-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))] text-[hsl(var(--text-on-brand))]' : 'border-[hsl(var(--border-strong))] text-[hsl(var(--text-primary))]'}`}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {openIndex === i
                      ? <path d="M18 6L6 18M6 6l12 12" />
                      : <path d="M12 5v14M5 12h14" />
                    }
                  </svg>
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === i ? 'max-h-96 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-base leading-relaxed text-[hsl(var(--text-secondary))]">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
