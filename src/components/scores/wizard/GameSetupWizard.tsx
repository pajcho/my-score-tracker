import { useState } from 'react';
import { GameTypeIcon } from '@/components/ui/gameTypeIcon';
import { ResponsiveFormModal } from '@/components/ui/responsiveFormModal';
import { PoolGameSetup } from './PoolGameSetup';
import { PingPongGameSetup } from './PingPongGameSetup';
import {
  GAME_TYPE_OPTIONS,
  type GameType,
} from '@/lib/gameTypes';
import {
  BreakRule,
} from '@/lib/supabaseDatabase';

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
  currentUserName?: string;
}

type ViewState = 'sport-selection' | 'pool-setup' | 'pingpong-setup';

export function GameSetupWizard({
  onOpenChange,
  onComplete,
  friends,
  lastPoolSettings,
  currentUserName = 'Player 1',
}: GameSetupWizardProps) {
  const [view, setView] = useState<ViewState>('sport-selection');
  const [stepMeta, setStepMeta] = useState({ step: 1, totalSteps: 4 });

  const handleCancel = () => {
    setView('sport-selection');
    setStepMeta({ step: 1, totalSteps: 4 });
    onOpenChange(false);
  };

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

  // Sport Selection View
  if (view === 'sport-selection') {
    return (
      <ResponsiveFormModal
        open
        onOpenChange={onOpenChange}
        title="Start a New Game"
        description={`Step ${stepMeta.step} of ${stepMeta.totalSteps}`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-7 sm:px-5 sm:pt-5 sm:pb-8">
          <div className="space-y-7">
            <p className="text-lg font-semibold text-foreground sm:text-xl">What game do you want to play?</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {GAME_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSportSelect(value)}
                  className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border-2 border-border transition-all hover:border-primary hover:bg-primary/5"
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
        description={`Step ${stepMeta.step} of ${stepMeta.totalSteps}`}
      >
        <PoolGameSetup
          friends={friends}
          lastPoolSettings={lastPoolSettings}
          currentUserName={currentUserName}
          onCancel={handleReturnToSportSelection}
          onProgressChange={(step, totalSteps) => setStepMeta({ step, totalSteps })}
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
        description={`Step ${stepMeta.step} of ${stepMeta.totalSteps}`}
      >
        <PingPongGameSetup
          friends={friends}
          currentUserName={currentUserName}
          onCancel={handleReturnToSportSelection}
          onProgressChange={(step, totalSteps) => setStepMeta({ step, totalSteps })}
          onComplete={onComplete}
        />
      </ResponsiveFormModal>
    );
  }

  return null;
}
