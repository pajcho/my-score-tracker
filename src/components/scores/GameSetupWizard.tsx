import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggleGroup';
import { GameTypeIcon, PoolTypeIcon } from '@/components/ui/gameTypeIcon';
import { Dices } from 'lucide-react';
import {
  BreakRule,
  PoolGameSettingsInput,
} from '@/lib/supabaseDatabase';
import {
  GAME_TYPE_OPTIONS,
  POOL_TYPE_OPTIONS,
  getPoolTypeLabel,
  isPoolGameType,
  type GameType,
  type PoolType,
} from '@/lib/gameTypes';

interface GameSetupWizardProps {
  onComplete: (data: {
    game: GameType;
    poolType: PoolType;
    opponent: string;
    opponentType: 'custom' | 'friend';
    selectedFriend: string;
    breakRule: BreakRule;
    firstBreakerSelection: 'player1' | 'player2' | 'random';
  }) => void;
  onCancel: () => void;
  friends: { id: string; name: string; email: string }[];
  lastPoolSettings?: {
    poolType: PoolType;
    breakRule: BreakRule;
  };
  currentUserName?: string;
}

type Step = 1 | 2 | 3 | 4;

const compactToggleOptionClassName =
  "h-9 justify-start rounded-md px-3 text-xs text-foreground hover:bg-muted/60 hover:text-foreground dark:bg-muted/40 dark:hover:bg-muted/55 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground data-[state=on]:shadow-none dark:data-[state=on]:bg-muted/65";

export function GameSetupWizard({
  onComplete,
  onCancel,
  friends,
  lastPoolSettings,
  currentUserName = 'Player 1',
}: GameSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [game, setGame] = useState<GameType>('Pool');
  const [poolType, setPoolType] = useState<PoolType>(lastPoolSettings?.poolType || '9-ball');
  const [breakRule, setBreakRule] = useState<BreakRule>(lastPoolSettings?.breakRule || 'alternate');
  const [opponent, setOpponent] = useState('');
  const [opponentType, setOpponentType] = useState<'custom' | 'friend'>('friend');
  const [selectedFriend, setSelectedFriend] = useState('');
  const [firstBreakerSelection, setFirstBreakerSelection] = useState<'player1' | 'player2' | 'random'>('random');
  const [randomBreakerHighlight, setRandomBreakerHighlight] = useState<'player1' | 'player2' | null>(null);

  // Get opponent name for display
  const opponentName =
    opponentType === 'friend'
      ? friends.find(f => f.id === selectedFriend)?.name || ''
      : opponent;

  // Step 1: Sport selection - auto-advance on click
  const handleSportSelect = (sportType: GameType) => {
    setGame(sportType);
    // Auto-advance to next step
    if (sportType === 'Pool') {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };

  // Step 3: Auto-advance when friend is selected
  const handleFriendSelect = (friendId: string) => {
    setSelectedFriend(friendId);
    setCurrentStep(4);
  };

  // Step 4: Random breaker selection
  const handleRandomizeBreaker = () => {
    const randomSide = Math.random() < 0.5 ? 'player1' : 'player2';
    setRandomBreakerHighlight(randomSide);
    setFirstBreakerSelection(randomSide);
  };

  // Confirm random selection by clicking the highlighted button
  const handleConfirmBreaker = (side: 'player1' | 'player2') => {
    setFirstBreakerSelection(side);
    handleSubmit();
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (game === 'Pool') setCurrentStep(2);
      else setCurrentStep(3);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (game === 'Pool') setCurrentStep(4);
      else handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) {
      if (game === 'Pool') setCurrentStep(2);
      else setCurrentStep(1);
    } else if (currentStep === 4) setCurrentStep(3);
  };

  const handleSubmit = () => {
    onComplete({
      game,
      poolType,
      opponent: opponentType === 'custom' ? opponent : '',
      opponentType,
      selectedFriend: opponentType === 'friend' ? selectedFriend : '',
      breakRule,
      firstBreakerSelection,
    });
  };

  const canProceed = (() => {
    if (currentStep === 3) {
      return opponentType === 'friend' ? !!selectedFriend : !!opponent;
    }
    return true;
  })();

  return (
    <Card className="shadow-card border-0 w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Start a New Game</CardTitle>
        <CardDescription>
          Step {currentStep} of {game === 'Pool' ? 4 : 3}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Sport Selection */}
        {currentStep === 1 && (
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
        )}

        {/* Step 2: Pool Settings (Pool only) */}
        {currentStep === 2 && game === 'Pool' && (
          <div className="space-y-6">
            <div>
              <Label className="text-base mb-3 block">Pool Type</Label>
              <ToggleGroup
                type="single"
                value={poolType}
                onValueChange={(value) => {
                  if (!value) return;
                  setPoolType(value as PoolType);
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
                  setBreakRule(value as BreakRule);
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
        )}

        {/* Step 3: Opponent Selection */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base mb-3 block">Who are you playing against?</Label>

              {friends.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-3">Select a friend:</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {friends.map((friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => handleFriendSelect(friend.id)}
                        className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedFriend === friend.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-semibold text-sm">{friend.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-3">Or enter a custom opponent:</p>
                <Input
                  placeholder="Opponent's name"
                  value={opponentType === 'custom' ? opponent : ''}
                  onChange={(e) => {
                    setOpponent(e.target.value);
                    setOpponentType('custom');
                    setSelectedFriend('');
                  }}
                  className="h-10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Who Breaks First (Pool only) */}
        {currentStep === 4 && game === 'Pool' && (
          <div className="space-y-6">
            <div>
              <Label className="text-base mb-4 block">Who breaks first?</Label>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => handleConfirmBreaker('player1')}
                  className={`py-6 px-4 rounded-lg border-2 transition-all cursor-pointer text-center ${
                    randomBreakerHighlight === 'player1'
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : firstBreakerSelection === 'player1'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">{currentUserName}</div>
                  <div className="text-sm text-muted-foreground">You</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmBreaker('player2')}
                  className={`py-6 px-4 rounded-lg border-2 transition-all cursor-pointer text-center ${
                    randomBreakerHighlight === 'player2'
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : firstBreakerSelection === 'player2'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">{opponentName}</div>
                  <div className="text-sm text-muted-foreground">Opponent</div>
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleRandomizeBreaker}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Dices className="h-4 w-4" />
                  Random
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-6 border-t">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrev}
              className="flex-1"
            >
              Back
            </Button>
          )}

          {currentStep < (game === 'Pool' ? 4 : 3) && (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="flex-1"
            >
              Next
            </Button>
          )}

          {currentStep === (game === 'Pool' ? 4 : 3) && (
            <Button
              onClick={handleSubmit}
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
