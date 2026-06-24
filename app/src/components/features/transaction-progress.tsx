interface Step {
  label: string;
  description?: string;
}

interface TransactionProgressProps {
  steps: Step[];
  currentStep: number;
}

export function TransactionProgress({ steps, currentStep }: TransactionProgressProps) {
  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
      <div className="flex items-start gap-0 min-w-max px-2">
        {steps.map((step, index) => (
        <div key={index} className="contents">
          <div className="flex flex-col items-center">
            <div
              className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                index < currentStep
                  ? 'bg-[var(--color-success)] text-white'
                  : index === currentStep
                    ? 'bg-[var(--color-brand-primary)] text-white'
                    : 'bg-[var(--color-bg-section)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]',
              ].join(' ')}
            >
              {index < currentStep ? (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <p
              className={[
                'mt-2 text-center text-xs font-medium max-w-[80px]',
                index <= currentStep ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]',
              ].join(' ')}
            >
              {step.label}
            </p>
            {step.description && (
              <p className="mt-0.5 text-center text-[10px] text-[var(--color-text-secondary)] max-w-[80px]">
                {step.description}
              </p>
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={[
                'mt-4 h-0.5 flex-1 min-w-[40px]',
                index < currentStep ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border-default)]',
              ].join(' ')}
            />
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
