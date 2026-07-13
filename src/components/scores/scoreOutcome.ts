import { cn } from '@/lib/utils';

/** "Save · Win 5–3" — states the outcome before committing, so a swapped
 * you-vs-them entry is caught at a glance. */
export function getOutcomePreview(yourScore: number, opponentScore: number, verb = 'Save') {
  const outcome = yourScore > opponentScore ? 'Win' : yourScore < opponentScore ? 'Loss' : 'Draw';
  return {
    outcome,
    label: `${verb} · ${outcome} ${yourScore}–${opponentScore}`,
  } as const;
}

export const outcomeButtonClassName = (outcome: 'Win' | 'Loss' | 'Draw') =>
  cn(
    outcome === 'Win' && 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    outcome === 'Loss' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
  );
