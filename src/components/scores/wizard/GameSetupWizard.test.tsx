import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameSetupWizard } from '@/components/scores/wizard/GameSetupWizard';

vi.mock('@/components/ui/responsiveFormModal', () => ({
  ResponsiveFormModal: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
      {children}
    </div>
  ),
}));

const friends = [{ id: 'friend-1', name: 'Mladen', email: 'mladen@example.com' }];

describe('GameSetupWizard', () => {
  it('starts a rematch in one tap from the quick-start card', () => {
    const onComplete = vi.fn();

    render(
      <GameSetupWizard
        onOpenChange={() => undefined}
        onComplete={onComplete}
        friends={friends}
        lastGameSetup={{
          game: 'Pool',
          poolType: '9-ball',
          breakRule: 'alternate',
          opponentType: 'friend',
          opponentName: 'Mladen',
          selectedFriendId: 'friend-1',
        }}
      />
    );

    expect(screen.getByText('Same as last game')).toBeInTheDocument();
    expect(screen.getByText(/9-Ball/)).toBeInTheDocument();
    expect(screen.getByText(/vs Mladen/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Same as last game/ }));

    expect(onComplete).toHaveBeenCalledWith({
      game: 'Pool',
      poolType: '9-ball',
      opponent: '',
      opponentType: 'friend',
      selectedFriend: 'friend-1',
      breakRule: 'alternate',
      firstBreakerSelection: 'random',
    });
  });

  it('shows the plain question and no quick-start card without a previous game', () => {
    render(
      <GameSetupWizard onOpenChange={() => undefined} onComplete={() => undefined} friends={friends} />
    );

    expect(screen.getByText('What game do you want to play?')).toBeInTheDocument();
    expect(screen.queryByText('Same as last game')).not.toBeInTheDocument();
  });

  it('renders segmented progress and advances on sport tap', () => {
    render(
      <GameSetupWizard onOpenChange={() => undefined} onComplete={() => undefined} friends={friends} />
    );

    expect(screen.getByLabelText('Step 1 of 4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pool/ }));
    expect(screen.getByLabelText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('Choose your pool rules.')).toBeInTheDocument();
  });
});
