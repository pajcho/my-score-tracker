import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PoolGameSetup } from '@/components/scores/wizard/PoolGameSetup';

vi.mock('@/components/ui/toggleGroup', () => ({
  ToggleGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe('PoolGameSetup', () => {
  it('submits the selected breaker immediately on the final step', () => {
    const onComplete = vi.fn();

    render(
      <PoolGameSetup
        friends={[{ id: 'friend-1', name: 'Opponent', email: 'opponent@example.com' }]}
        currentUserName="Current User"
        onCancel={() => undefined}
        onComplete={onComplete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Opponent' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Opponent Opponent' }));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      firstBreakerSelection: 'player2',
      selectedFriend: 'friend-1',
    }));
  });

  it('submits a randomly chosen player side when starting via the Start Game button', () => {
    const onComplete = vi.fn();

    render(
      <PoolGameSetup
        friends={[{ id: 'friend-1', name: 'Opponent', email: 'opponent@example.com' }]}
        currentUserName="Current User"
        onCancel={() => undefined}
        onComplete={onComplete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Opponent' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: /Random/ }));
    fireEvent.click(screen.getByRole('button', { name: /Start Game/ }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const submittedSelection = onComplete.mock.calls[0][0].firstBreakerSelection;
    expect(['player1', 'player2']).toContain(submittedSelection);
  });
});
