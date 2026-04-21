import { useState } from 'react';

const FAQS = [
  {
    question: 'What is Prova and who is it for?',
    answer:
      'Prova is an on-chain trade credit insurance platform built on Arbitrum. It is for any business selling goods or services on credit terms — if you issue invoices and give buyers time to pay, Prova can protect you. Liquidity providers who want USDC yield backed by real trade transactions can also participate.',
  },
  {
    question: 'Do I need to be an exporter to use Prova?',
    answer:
      'No. Any business selling goods or services on credit can use Prova — whether you are a manufacturer, wholesaler, service provider, or trading company. If you issue invoices and extend payment terms to buyers, Prova is built for you.',
  },
  {
    question: 'How does the underwriting work?',
    answer:
      'Prova uses Fully Homomorphic Encryption (FHE) via Fhenix CoFHE. When you create coverage for an invoice, Prova evaluates your buyer\'s creditworthiness using an encrypted score — the underwriting contract computes directly on the encrypted value without ever decrypting it. The result is an encrypted premium in basis points. No plaintext financial data is stored or exposed on-chain at any point.',
  },
  {
    question: 'What happens when a buyer does not pay?',
    answer:
      'When an invoice passes its due date unpaid, a 7-day waiting period begins automatically on-chain. Once that window closes, the payment condition is met. You then initiate the claim with a single transaction — the contract verifies the condition and releases your payout directly from the insurance pool to your wallet. No adjuster, no paperwork, no manual review.',
  },
  {
    question: 'Is Prova non-custodial?',
    answer:
      'Yes. Funds are held inside smart contracts on Arbitrum — neither Prova nor the underlying Reineira infrastructure ever takes custody of your money. Your account is a ZeroDev passkey smart account tied to your device, not a seed phrase. You are always in control.',
  },
  {
    question: 'How do liquidity providers earn yield?',
    answer:
      'Liquidity providers deposit USDC into the insurance pool. Their capital backs active trade credit policies and earns a proportional share of premiums collected. Exposure is automatically diversified across all active policies — no manual rebalancing needed. Deposits are non-custodial and withdrawable at any time subject to pool liquidity.',
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
            and what happens to your money and your data.
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
