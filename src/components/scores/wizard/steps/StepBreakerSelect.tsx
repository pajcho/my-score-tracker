import { Label } from '@/components/ui/label';
import { Dices } from 'lucide-react';

interface StepBreakerSelectProps {
  player1Name: string;
  player2Name: string;
  selectedBreaker: 'player1' | 'player2' | 'random';
  randomHighlight: 'player1' | 'player2' | null;
  onSelectBreaker: (side: 'player1' | 'player2') => void;
  onRandomize: () => void;
}

export function StepBreakerSelect({
  player1Name,
  player2Name,
  selectedBreaker,
  randomHighlight,
  onSelectBreaker,
  onRandomize,
}: StepBreakerSelectProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base mb-4 block">Who breaks first?</Label>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            type="button"
            onClick={() => onSelectBreaker('player1')}
            className={`py-6 px-4 rounded-lg border-2 transition-all cursor-pointer text-center ${
              randomHighlight === 'player1'
                ? 'border-primary bg-primary/10 shadow-lg'
                : selectedBreaker === 'player1'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-semibold">{player1Name}</div>
            <div className="text-sm text-muted-foreground">You</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectBreaker('player2')}
            className={`py-6 px-4 rounded-lg border-2 transition-all cursor-pointer text-center ${
              randomHighlight === 'player2'
                ? 'border-primary bg-primary/10 shadow-lg'
                : selectedBreaker === 'player2'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-semibold">{player2Name}</div>
            <div className="text-sm text-muted-foreground">Opponent</div>
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onRandomize}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Dices className="h-4 w-4" />
            Random
          </button>
        </div>
      </div>
    </div>
  );
}
