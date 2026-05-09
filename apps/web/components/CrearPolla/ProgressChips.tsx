'use client';

// 3-step progress chips. Mirrors la-polla's wizard header (1 Info · 2 Partidos
// · 3 Configuración). Active step is gold; future steps are muted; past steps
// are clickable so the user can go back without losing form state — that's
// owned by the parent <CrearPollaWizard/>, we just emit a click event here.

export type WizardStep = 1 | 2 | 3;

const LABELS: Record<WizardStep, string> = {
  1: 'Info',
  2: 'Partidos',
  3: 'Configuración',
};

export function ProgressChips({
  current,
  onJump,
}: {
  current: WizardStep;
  onJump?: (step: WizardStep) => void;
}) {
  const steps: WizardStep[] = [1, 2, 3];
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-3">
      {steps.map((step, idx) => {
        const isActive = step === current;
        const isPast = step < current;
        const isClickable = isPast && !!onJump;
        return (
          <div key={step} className="flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => isClickable && onJump?.(step)}
              disabled={!isClickable}
              className={`flex items-center gap-2 transition ${
                isClickable ? 'hover:opacity-80' : ''
              } ${!isClickable ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span
                className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full font-display tracking-[0.04em] text-sm border transition ${
                  isActive
                    ? 'bg-gold text-black border-gold'
                    : isPast
                      ? 'bg-bg-card text-gold border-gold/60'
                      : 'bg-bg-card text-text-muted border-border-default'
                }`}
              >
                {step}
              </span>
              <span
                className={`hidden sm:inline font-display tracking-[0.08em] text-xs uppercase ${
                  isActive
                    ? 'text-text-primary'
                    : isPast
                      ? 'text-text-secondary'
                      : 'text-text-muted'
                }`}
              >
                {LABELS[step]}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <span
                className={`block h-px w-6 sm:w-10 ${
                  step < current ? 'bg-gold/60' : 'bg-border-default'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
