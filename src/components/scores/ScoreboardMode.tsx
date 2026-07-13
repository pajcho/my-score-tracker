import { useEffect, useRef, useState } from 'react';
import { Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveGameView, PlayerSide } from '@/lib/supabaseDatabase';
import { getDisplayGameLabel, isPoolGameType } from '@/lib/gameTypes';

interface ScoreboardModeProps {
  game: LiveGameView;
  leftLabel: string;
  rightLabel: string;
  onScore: (side: PlayerSide, change: 1 | -1) => void;
  onClose: () => void;
}

const SWIPE_CLOSE_THRESHOLD_PX = 80;

/**
 * Fullscreen scoreboard: the whole screen is the control. Tap a half to
 * score it, −1 chips correct, the center pill flips the board 180° so the
 * opponent across the table can read it. Scores stay live through the same
 * debounced write pipeline as the cards.
 */
export function ScoreboardMode({ game, leftLabel, rightLabel, onScore, onClose }: ScoreboardModeProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  // The board owns the whole viewport while open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isPoolGame = isPoolGameType(game.game) && !!game.pool_settings;
  const nextBreakerSide = game.pool_settings?.current_breaker_side;
  const rackNumber = game.score1 + game.score2 + 1;
  const breakerLabel =
    isPoolGame && nextBreakerSide ? (nextBreakerSide === 'player1' ? leftLabel : rightLabel) : null;
  const contextPill = [
    getDisplayGameLabel(game.game, game.pool_settings?.pool_type),
    ...(isPoolGame ? [`Rack ${rackNumber}`] : []),
    ...(breakerLabel ? [`${breakerLabel === 'You' ? 'You break' : `${breakerLabel} breaks`}`] : []),
  ].join(' · ');

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const startY = touchStartYRef.current;
    touchStartYRef.current = null;
    if (startY === null) return;
    const endY = event.changedTouches[0]?.clientY ?? startY;
    if (endY - startY > SWIPE_CLOSE_THRESHOLD_PX) {
      onClose();
    }
  };

  const renderHalf = (side: PlayerSide, label: string, score: number, className: string) => (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Score for ${label}: ${score}. Tap to add a point.`}
      onClick={() => onScore(side, 1)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onScore(side, 1);
      }}
      className={cn(
        'flex flex-1 select-none flex-col items-center justify-center gap-4 text-white',
        'transition-[filter] active:brightness-110 [-webkit-touch-callout:none]',
        className
      )}
    >
      <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest opacity-90">
        {isPoolGame && nextBreakerSide === side && (
          <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden="true">
            <circle cx="6" cy="6" r="5.5" fill="white" />
            <circle cx="4.2" cy="4.2" r="1.7" fill="black" opacity="0.15" />
          </svg>
        )}
        {label}
      </span>
      <span key={score} className="animate-score-pop text-[110px] font-extrabold leading-none tabular-nums">
        {score}
      </span>
      <button
        type="button"
        aria-label={`Remove point for ${label}`}
        disabled={score === 0}
        onClick={(event) => {
          event.stopPropagation();
          onScore(side, -1);
        }}
        className="mt-3 min-w-[64px] rounded-full bg-white/20 px-4 py-2 text-base font-bold transition-transform active:scale-95 disabled:opacity-40"
      >
        <Minus className="mx-auto h-5 w-5" />
      </button>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-label="Fullscreen scoreboard"
      className="fixed inset-0 z-50 flex bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Stacked halves: each player owns a full-width half of the screen —
          roughly double the tap area of side-by-side columns in portrait. */}
      <div className={cn('flex flex-1 flex-col transition-transform duration-300', isFlipped && 'rotate-180')}>
        {renderHalf('player1', leftLabel, game.score1, 'bg-player-one')}
        {renderHalf('player2', rightLabel, game.score2, 'bg-player-two')}
      </div>

      <button
        type="button"
        onClick={() => setIsFlipped((flipped) => !flipped)}
        className="absolute left-1/2 top-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 truncate whitespace-nowrap rounded-full bg-foreground/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-background shadow-lg backdrop-blur transition-transform active:scale-95"
        aria-label="Flip scoreboard to face the opponent"
        title="Tap to flip the board for the player across the table"
      >
        {contextPill}
      </button>

      <button
        type="button"
        onClick={onClose}
        aria-label="Exit fullscreen scoreboard"
        className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white transition-transform active:scale-95"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
