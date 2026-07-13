import { Label } from '@/components/ui/label';
import { ChoiceChip } from '@/components/ui/choiceChip';
import { StepperInput } from '@/components/ui/stepperInput';

const QUICK_DURATION_OPTIONS = [30, 60, 90];

interface DurationFieldProps {
  value: number;
  onChange: (minutes: number) => void;
  idPrefix: string;
}

/** Duration entry: quick chips for the usual sessions, stepper for the rest. */
export function DurationField({ value, onChange, idPrefix }: DurationFieldProps) {
  return (
    <div className="space-y-2">
      <Label id={`${idPrefix}-duration-label`}>Duration (minutes) *</Label>
      <div className="flex flex-wrap gap-2" aria-labelledby={`${idPrefix}-duration-label`}>
        {QUICK_DURATION_OPTIONS.map((minutes) => (
          <ChoiceChip key={minutes} active={value === minutes} onClick={() => onChange(minutes)}>
            {minutes}m
          </ChoiceChip>
        ))}
      </div>
      <StepperInput value={value} onValueChange={onChange} label="Duration in minutes" min={0} step={5} />
    </div>
  );
}
