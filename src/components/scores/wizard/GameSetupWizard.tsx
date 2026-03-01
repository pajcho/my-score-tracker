import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { GameTypeIcon } from '@/components/ui/gameTypeIcon';
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
  onComplete: (data: {
    game: GameType;
    poolType: string;
    opponent: string;
    opponentType: 'custom' | 'friend';
    selectedFriend: string;
    breakRule: BreakRule;
    firstBreakerSelection: 'player1' | 'player2' | 'random';
  }) => void;
  onCancel: () => void;
  friends: { id: string; name: string; email: string }[];
  lastPoolSettings?: {
    poolType: string;
    breakRule: BreakRule;
  };
  currentUserName?: string;
}

type ViewState = 'sport-selection' | 'pool-setup' | 'pingpong-setup';

export function GameSetupWizard({
  onComplete,
  onCancel,
  friends,
  lastPoolSettings,
  currentUserName = 'Player 1',
}: GameSetupWizardProps) {
  const [view, setView] = useState<ViewState>('sport-selection');

  const handleSportSelect = (sport: GameType) => {
    if (sport === 'Pool') {
      setView('pool-setup');
    } else {
      setView('pingpong-setup');
    }
  };

  // Sport Selection View
  if (view === 'sport-selection') {
    return (
      <Card className="shadow-card border-0 w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Start a New Game</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base">What game do you want to play?</Label>
            <div className="grid grid-cols-2 gap-4">
              {GAME_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSportSelect(value as GameType)}
                  className="h-40 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer"
                >
                  <GameTypeIcon gameType={value} className="h-12 w-12" />
                  <span className="text-lg font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-6 border-t">
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

  // Pool Game Setup View
  if (view === 'pool-setup') {
    return (
      <PoolGameSetup
        friends={friends}
        lastPoolSettings={lastPoolSettings}
        currentUserName={currentUserName}
        onCancel={() => setView('sport-selection')}
        onComplete={onComplete}
      />
    );
  }

  // Ping Pong Game Setup View
  if (view === 'pingpong-setup') {
    return (
      <PingPongGameSetup
        friends={friends}
        currentUserName={currentUserName}
        onCancel={() => setView('sport-selection')}
        onComplete={onComplete}
      />
    );
  }

  return null;
}
