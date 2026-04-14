import { useState } from 'react';

const FAQS = [
  {
    question: 'What is Prova and who is it for?',
    answer:
      'Prova is a ZK-shielded trade credit insurance protocol built on-chain. It is designed for merchants who need receivables protection, underwriters who want to build programmable risk books, and liquidity providers seeking institutional fixed-income yields — all without the friction of traditional finance.',
  },
  {
    question: 'How does ZK-shielded underwriting work?',
    answer:
      'Prova uses Zero-Knowledge proofs to verify merchant credit scores and policy conditions without exposing the underlying financial data to underwriters or liquidity providers. Your creditworthiness is proven on-chain — but your business relationships, invoice values, and counterparties remain private.',
  },
  {
    question: 'Is Prova non-custodial?',
    answer:
      'Yes. Prova is fully non-custodial. Premiums and settlement funds are held in audited smart contract escrows on-chain. You retain ownership of your keys and capital at all times — Prova never holds your funds.',
  },
  {
    question: 'How are claims settled?',
    answer:
      'Claims are settled automatically when on-chain conditions are met — no adjuster, no manual review, no delay. The settlement engine reads from verified ZK-proofs and executes payout directly to the insured wallet, typically within seconds of a trigger event.',
  },
  {
    question: 'Is Prova compliant with financial regulations?',
    answer:
      'Yes. Every policy verification is designed to satisfy major financial regulations. Our ZK-proof architecture allows you to demonstrate compliance to regulators without disclosing sensitive data publicly. Jurisdiction-aware policy filters and KYC/AML hooks are built into the protocol.',
  },
  {
    question: 'What does coverage cost?',
    answer:
      'Premium rates are set dynamically by underwriter policies. Rates typically range from 0.5% to 2% depending on the merchant\'s ZK-credit score, the coverage duration, and the underwriter\'s current risk appetite. There are no minimums and no hidden fees.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-16 max-w-xl space-y-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
            Got questions?
          </p>
          <h2 className="text-5xl font-black tracking-tight text-[hsl(var(--text-primary))] sm:text-6xl">
            Frequently asked.
          </h2>
          <p className="text-lg text-[hsl(var(--text-secondary))]">
            Everything you need to know about how Prova works, who it is for,
            and how your funds are protected.
          </p>
        </div>

        {/* Accordion */}
        <div className="max-w-3xl divide-y divide-[hsl(var(--border-subtle))] border-t border-[hsl(var(--border-subtle))]">
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
