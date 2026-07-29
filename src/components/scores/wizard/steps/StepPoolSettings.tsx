import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem, compactToggleOptionClassName } from '@/components/ui/toggleGroup';
import { PoolTypeIcon } from '@/components/ui/gameTypeIcon';
import { POOL_TYPE_OPTIONS } from '@/lib/gameTypes';
import type { PoolType, BreakRule } from '@/lib/supabaseDatabase';

interface StepPoolSettingsProps {
  poolType: PoolType;
  breakRule: BreakRule;
  onPoolTypeChange: (poolType: PoolType) => void;
  onBreakRuleChange: (breakRule: BreakRule) => void;
}

export function StepPoolSettings({
  poolType,
  breakRule,
  onPoolTypeChange,
  onBreakRuleChange,
}: StepPoolSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base mb-3 block">Pool Type</Label>
        <ToggleGroup
          type="single"
          value={poolType}
          onValueChange={(value) => {
            if (!value) return;
            onPoolTypeChange(value as PoolType);
          }}
          className="grid grid-cols-3 gap-2"
        >
          {POOL_TYPE_OPTIONS.map(({ value, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              variant="outline"
              className={compactToggleOptionClassName}
            >
              <PoolTypeIcon poolType={value} className="mr-2 h-3.5 w-3.5" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div>
        <Label className="text-base mb-3 block">Break Rule</Label>
        <ToggleGroup
          type="single"
          value={breakRule}
          onValueChange={(value) => {
            if (!value) return;
            onBreakRuleChange(value as BreakRule);
          }}
          className="grid grid-cols-2 gap-2"
        >
          <ToggleGroupItem
            value="alternate"
            variant="outline"
            className={compactToggleOptionClassName}
          >
            Alternate
          </ToggleGroupItem>
          <ToggleGroupItem
            value="winner_stays"
            variant="outline"
            className={compactToggleOptionClassName}
          >
            Winner Stays
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
