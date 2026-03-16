import { useEffect, useState } from 'react';
import { WizardLayout } from './WizardLayout';
import { StepOpponentSelect } from './steps/StepOpponentSelect';
import type { BreakRule } from '@/lib/supabaseDatabase';
import type { GameType } from '@/lib/gameTypes';

interface PingPongGameSetupProps {
  friends: { id: string; name: string; email: string }[];
  currentUserName: string;
  onCancel: () => void;
  onProgressChange?: (step: number, totalSteps: number) => void;
  onComplete: (data: {
    game: GameType;
    poolType: string;
    opponent: string;
    opponentType: 'custom' | 'friend';
    selectedFriend: string;
    breakRule: BreakRule;
    firstBreakerSelection: 'player1' | 'player2' | 'random';
  }) => void;
}

export function PingPongGameSetup({
  friends,
  currentUserName,
  onCancel,
  onProgressChange,
  onComplete,
}: PingPongGameSetupProps) {
  const [opponent, setOpponent] = useState('');
  const [opponentType, setOpponentType] = useState<'custom' | 'friend'>('friend');
  const [selectedFriend, setSelectedFriend] = useState('');

  useEffect(() => {
    onProgressChange?.(2, 2);
  }, [onProgressChange]);

  void currentUserName;

  const handleFriendSelect = (friendId: string) => {
    setSelectedFriend(friendId);
    setOpponentType('friend');
    setOpponent('');
    // Auto-submit
    onComplete({
      game: 'Ping Pong',
      poolType: '',
      opponent: '',
      opponentType: 'friend',
      selectedFriend: friendId,
      breakRule: 'alternate',
      firstBreakerSelection: 'random',
    });
  };

  const handleCustomOpponentSelect = (name: string) => {
    setOpponent(name);
    setOpponentType('custom');
    setSelectedFriend('');
  };

  const handleSubmit = () => {
    onComplete({
      game: 'Ping Pong',
      poolType: '',
      opponent: opponentType === 'custom' ? opponent : '',
      opponentType,
      selectedFriend: opponentType === 'friend' ? selectedFriend : '',
      breakRule: 'alternate',
      firstBreakerSelection: 'random',
    });
  };

  const canProceed = opponentType === 'friend' ? !!selectedFriend : !!opponent;

  return (
    <WizardLayout
      step={1}
      totalSteps={1}
      subtitle="Choose your opponent."
      onCancel={onCancel}
      onSubmit={handleSubmit}
      canProceed={canProceed}
    >
      <StepOpponentSelect
        friends={friends}
        selectedFriendId={selectedFriend}
        customOpponentName={opponentType === 'custom' ? opponent : ''}
        onSelectFriend={handleFriendSelect}
        onSelectCustom={handleCustomOpponentSelect}
      />
    </WizardLayout>
  );
}
