import { useCallback, useState } from 'react';
import { Zap } from 'lucide-react';
import { GameTypeIcon } from '@/components/ui/gameTypeIcon';
import { ResponsiveFormModal } from '@/components/ui/responsiveFormModal';
import { cn } from '@/lib/utils';
import { PoolGameSetup } from './PoolGameSetup';
import { PingPongGameSetup } from './PingPongGameSetup';
import {
  GAME_TYPE_OPTIONS,
  getDisplayGameLabel,
  isPoolGameType,
  type GameType,
  type PoolType,
} from '@/lib/gameTypes';
import {
  BreakRule,
} from '@/lib/supabaseDatabase';

export interface QuickStartSetup {
  game: GameType;
  poolType?: PoolType;
  breakRule?: BreakRule;
  opponentType: 'custom' | 'friend';
  opponentName: string;
  selectedFriendId?: string;
}

interface GameSetupWizardProps {
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    game: GameType;
    poolType: string;
    opponent: string;
    opponentType: 'custom' | 'friend';
    selectedFriend: string;
    breakRule: BreakRule;
    firstBreakerSelection: 'player1' | 'player2' | 'random';
  }) => void;
  friends: { id: string; name: string; email: string }[];
  lastPoolSettings?: {
    poolType: string;
    breakRule: BreakRule;
  };
  /** Full setup of the most recent game — powers the one-tap rematch card. */
  lastGameSetup?: QuickStartSetup;
  currentUserName?: string;
}

type ViewState = 'sport-selection' | 'pool-setup' | 'pingpong-setup';

/** Thin segmented progress bar — reads instantly, unlike "Step 2 of 4". */
function WizardProgress({ current, total }: { current: number; total: number }) {
  return (
    <span
      className="mt-1.5 flex items-center gap-1.5"
      role="img"
      aria-label={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors',
            index < current ? 'bg-primary' : 'bg-muted'
          )}
        />
      ))}
    </span>
  );
}

export function GameSetupWizard({
  onOpenChange,
  onComplete,
  friends,
  lastPoolSettings,
  lastGameSetup,
  currentUserName = 'Player 1',
}: GameSetupWizardProps) {
  const [view, setView] = useState<ViewState>('sport-selection');
  const [stepMeta, setStepMeta] = useState({ step: 1, totalSteps: 4 });

  // Stable identity + value bail-out. The setup views report progress from
  // an effect that depends on this callback; an inline arrow here recreates
  // it every render, which re-fires the effect, which sets a new (equal)
  // state object, which re-renders — an unbounded update loop.
  const handleProgressChange = useCallback((step: number, totalSteps: number) => {
    setStepMeta((previous) =>
      previous.step === step && previous.totalSteps === totalSteps ? previous : { step, totalSteps }
    );
  }, []);

  const handleReturnToSportSelection = () => {
    setView('sport-selection');
    setStepMeta({ step: 1, totalSteps: 4 });
  };

  const handleSportSelect = (sport: GameType) => {
    if (sport === 'Pool') {
      setStepMeta({ step: 2, totalSteps: 4 });
      setView('pool-setup');
    } else {
      setStepMeta({ step: 2, totalSteps: 2 });
      setView('pingpong-setup');
    }
  };

  const quickStartSummary = lastGameSetup
    ? [
        getDisplayGameLabel(lastGameSetup.game, lastGameSetup.poolType),
        ...(isPoolGameType(lastGameSetup.game) && lastGameSetup.breakRule
          ? [lastGameSetup.breakRule === 'alternate' ? 'Alternate break' : 'Winner stays', 'Random first break']
          : []),
        `vs ${lastGameSetup.opponentName}`,
      ].join(' · ')
    : null;

  const handleQuickStart = () => {
    if (!lastGameSetup) return;
    onComplete({
      game: lastGameSetup.game,
      poolType: lastGameSetup.poolType ?? '',
      opponent: lastGameSetup.opponentType === 'custom' ? lastGameSetup.opponentName : '',
      opponentType: lastGameSetup.opponentType,
      selectedFriend: lastGameSetup.opponentType === 'friend' ? lastGameSetup.selectedFriendId ?? '' : '',
      breakRule: lastGameSetup.breakRule ?? 'alternate',
      firstBreakerSelection: 'random',
    });
  };

  // Sport Selection View
  if (view === 'sport-selection') {
    return (
      <ResponsiveFormModal
        open
        onOpenChange={onOpenChange}
        title="Start a New Game"
        description={<WizardProgress current={stepMeta.step} total={stepMeta.totalSteps} />}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-7 sm:px-5 sm:pt-5 sm:pb-8">
          <div className="space-y-6">
            {lastGameSetup && quickStartSummary ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleQuickStart}
                  className="w-full rounded-xl border-2 border-primary/60 bg-primary/5 p-4 text-left transition-all hover:bg-primary/10 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <Zap className="h-4 w-4 text-primary" />
                      Same as last game
                    </span>
                    <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary">
                      Fastest
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{quickStartSummary}</p>
                  <span className="mt-3 flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                    Start now
                  </span>
                </button>
                <p className="text-center text-xs text-muted-foreground">or set up from scratch</p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-foreground sm:text-xl">What game do you want to play?</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              {GAME_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSportSelect(value)}
                  className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border-2 border-border transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98] sm:min-h-44"
                >
                  <GameTypeIcon gameType={value} className="h-12 w-12" />
                  <span className="text-lg font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ResponsiveFormModal>
    );
  }

  // Pool Game Setup View
  if (view === 'pool-setup') {
    return (
      <ResponsiveFormModal
        open
        onOpenChange={onOpenChange}
        title="Start a New Game"
        description={<WizardProgress current={stepMeta.step} total={stepMeta.totalSteps} />}
      >
        <PoolGameSetup
          friends={friends}
          lastPoolSettings={
            lastPoolSettings
              ? { poolType: lastPoolSettings.poolType as PoolType, breakRule: lastPoolSettings.breakRule }
              : undefined
          }
          currentUserName={currentUserName}
          onCancel={handleReturnToSportSelection}
          onProgressChange={handleProgressChange}
          onComplete={onComplete}
        />
      </ResponsiveFormModal>
    );
  }

  // Ping Pong Game Setup View
  if (view === 'pingpong-setup') {
    return (
      <ResponsiveFormModal
        open
        onOpenChange={onOpenChange}
        title="Start a New Game"
        description={<WizardProgress current={stepMeta.step} total={stepMeta.totalSteps} />}
      >
        <PingPongGameSetup
          friends={friends}
          currentUserName={currentUserName}
          onCancel={handleReturnToSportSelection}
          onProgressChange={handleProgressChange}
          onComplete={onComplete}
        />
      </ResponsiveFormModal>
    );
  }

  return null;
}
