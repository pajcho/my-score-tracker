import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { StreakTier } from './rackHistory';

const BANNER_ONLY_DURATION_MS = 2200;

interface StreakCelebrationProps {
  tier: StreakTier;
  streakLength: number;
  winnerLabel: string;
  /** Only the streak winner gets a taunt picker, and only against a registered opponent. */
  taunt?: {
    recipientLabel: string;
    onSend: (emojis: string[]) => void;
  };
  onClose: () => void;
}

/** Fullscreen "Double! / Triple! / Quadra! / K.O.!" banner after a winning streak. */
export function StreakCelebration({ tier, streakLength, winnerLabel, taunt, onClose }: StreakCelebrationProps) {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>(tier.tauntEmojis);

  // Without a picker the banner is just a flash; it must not block scoring.
  useEffect(() => {
    if (taunt) return undefined;
    const timer = setTimeout(onClose, BANNER_ONLY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [taunt, onClose]);

  const toggleEmoji = (emoji: string) => {
    setSelectedEmojis((current) =>
      current.includes(emoji) ? current.filter((selected) => selected !== emoji) : [...current, emoji]
    );
  };

  return (
    <div
      role="dialog"
      aria-label={`${tier.label} ${winnerLabel} won ${streakLength} in a row`}
      className="fixed inset-0 z-[60] !mt-0 flex animate-in fade-in flex-col items-center justify-center gap-6 bg-black/70 px-6 text-center text-white backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="animate-streak-in text-7xl font-black uppercase italic tracking-tight drop-shadow-[0_6px_0_rgba(0,0,0,0.35)] [text-shadow:0_0_32px_rgba(250,204,21,0.7)] sm:text-8xl">
        <span className="bg-gradient-to-b from-yellow-200 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
          {tier.label}
        </span>
      </div>
      <p className="text-lg font-semibold">
        {winnerLabel} won {streakLength} in a row
      </p>

      {taunt && (
        <div className="flex flex-col items-center gap-4" onClick={(event) => event.stopPropagation()}>
          <p className="text-sm text-white/80">
            {tier.allowsMix ? `Pick a mix to drop on ${taunt.recipientLabel}` : `Send ${taunt.recipientLabel} a taunt`}
          </p>
          <div className="flex gap-3">
            {tier.tauntEmojis.map((emoji) => {
              const isSelected = selectedEmojis.includes(emoji);
              return (
                <button
                  key={emoji}
                  type="button"
                  aria-label={tier.allowsMix ? `Include ${emoji}` : `Send ${emoji}`}
                  aria-pressed={tier.allowsMix ? isSelected : undefined}
                  onClick={() => (tier.allowsMix ? toggleEmoji(emoji) : taunt.onSend([emoji]))}
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-4xl transition-transform active:scale-90',
                    tier.allowsMix && isSelected && 'bg-white/35 ring-2 ring-yellow-300',
                    tier.allowsMix && !isSelected && 'opacity-50'
                  )}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          {tier.allowsMix && (
            <button
              type="button"
              disabled={selectedEmojis.length === 0}
              onClick={() => taunt.onSend(selectedEmojis)}
              className="h-11 rounded-full bg-yellow-400 px-6 text-sm font-bold text-black transition-transform active:scale-95 disabled:opacity-40"
            >
              Drop the mix
            </button>
          )}
          <button type="button" onClick={onClose} className="min-h-11 px-4 text-sm font-medium text-white/70">
            Not now
          </button>
        </div>
      )}
    </div>
  );
}
