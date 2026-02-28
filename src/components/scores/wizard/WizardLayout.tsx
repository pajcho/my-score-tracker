import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WizardLayoutProps {
  title: string;
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  onNext?: () => void;
  onSubmit?: () => void;
  canProceed?: boolean;
}

export function WizardLayout({
  title,
  step,
  totalSteps,
  onBack,
  onCancel,
  children,
  onNext,
  onSubmit,
  canProceed = true,
}: WizardLayoutProps) {
  const isLastStep = step === totalSteps;

  return (
    <Card className="shadow-card border-0 w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {totalSteps > 1 && (
          <CardDescription>
            Step {step} of {totalSteps}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {children}

        {/* Navigation */}
        <div className="flex gap-3 pt-6 border-t">
          {step > 1 && onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              Back
            </Button>
          )}

          {!isLastStep && onNext && (
            <Button
              onClick={onNext}
              disabled={!canProceed}
              className="flex-1"
            >
              Next
            </Button>
          )}

          {isLastStep && onSubmit && (
            <Button
              onClick={onSubmit}
              className="flex-1"
            >
              Start Game
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
