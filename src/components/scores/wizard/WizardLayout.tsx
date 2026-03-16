import { ArrowLeft, ArrowRight, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardLayoutProps {
  step: number;
  totalSteps: number;
  subtitle: string;
  onBack?: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  onNext?: () => void;
  onSubmit?: () => void;
  canProceed?: boolean;
}

export function WizardLayout({
  step,
  totalSteps,
  subtitle,
  onBack,
  onCancel,
  children,
  onNext,
  onSubmit,
  canProceed = true,
}: WizardLayoutProps) {
  const isLastStep = step === totalSteps;
  const primaryAction = !isLastStep && onNext ? (
    <Button
      onClick={onNext}
      disabled={!canProceed}
      className="flex-1 sm:flex-none"
    >
      <ArrowRight className="h-4 w-4" />
      Next
    </Button>
  ) : isLastStep && onSubmit ? (
    <Button
      onClick={onSubmit}
      disabled={!canProceed}
      className="flex-1 sm:flex-none"
    >
      <Play className="h-4 w-4" />
      Start Game
    </Button>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-7 sm:px-5 sm:pt-5 sm:pb-8">
        <div className="space-y-7">
          {step > 1 && onBack ? (
            <div className="flex items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="-ml-2 h-auto gap-2 px-2 py-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          ) : null}

          <div className="space-y-6">
            <p className="text-lg font-semibold text-foreground sm:text-xl">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-4 pt-5 sm:px-5">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1 sm:flex-none"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>

        {primaryAction ? (
          <div className="flex flex-1 justify-end">
            {primaryAction}
          </div>
        ) : <div />}
      </div>
    </div>
  );
}
