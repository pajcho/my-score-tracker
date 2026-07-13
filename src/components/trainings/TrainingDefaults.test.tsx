import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  isAuthenticatedMock,
  createTrainingMock,
  updateTrainingMock,
  toastMock,
  invalidateTrackerQueriesMock,
} = vi.hoisted(() => ({
  isAuthenticatedMock: vi.fn(),
  createTrainingMock: vi.fn(),
  updateTrainingMock: vi.fn(),
  toastMock: vi.fn(),
  invalidateTrackerQueriesMock: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/lib/supabaseAuth', () => ({
  supabaseAuth: {
    isAuthenticated: isAuthenticatedMock,
  },
}));

vi.mock('@/lib/supabaseDatabase', () => ({
  supabaseDb: {
    createTraining: createTrainingMock,
    updateTraining: updateTrainingMock,
  },
}));

vi.mock('@/lib/queryCache', () => ({
  invalidateTrackerQueries: invalidateTrackerQueriesMock,
}));

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div>calendar</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { TrainingForm } from '@/components/trainings/TrainingForm';
import { TrainingEditDialog } from '@/components/trainings/TrainingEditDialog';

const editableTraining = {
  id: 'training-1',
  user_id: 'user-1',
  game: 'Pool' as const,
  title: 'Initial title',
  training_date: '2026-02-15',
  duration_minutes: 30,
  notes: null,
  created_at: '2026-02-15T00:00:00.000Z',
  updated_at: '2026-02-15T00:00:00.000Z',
};

describe('Training forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticatedMock.mockReturnValue(true);
    createTrainingMock.mockResolvedValue({ id: 'training-1' });
    updateTrainingMock.mockResolvedValue(undefined);
    invalidateTrackerQueriesMock.mockResolvedValue(undefined);
  });

  it('uses "Training" as default title when creating with an empty name', async () => {
    const onSuccess = vi.fn();
    render(<TrainingForm onCancel={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: '60m' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Save Training' }).closest('form'));

    await waitFor(() => {
      expect(createTrainingMock).toHaveBeenCalledWith(
        expect.any(String),
        'Training',
        expect.any(String),
        60,
        ''
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('sets duration via quick chips and adjusts it with the stepper', () => {
    render(<TrainingForm onCancel={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '30m' }));
    expect(screen.getByLabelText('Duration in minutes')).toHaveTextContent('30');

    fireEvent.click(screen.getByRole('button', { name: 'Increase duration in minutes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase duration in minutes' }));
    expect(screen.getByLabelText('Duration in minutes')).toHaveTextContent('40');

    fireEvent.click(screen.getByRole('button', { name: 'Decrease duration in minutes' }));
    expect(screen.getByLabelText('Duration in minutes')).toHaveTextContent('35');
  });

  it('disables saving until a duration is set', () => {
    render(<TrainingForm onCancel={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Save Training' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '90m' }));
    expect(screen.getByRole('button', { name: 'Save Training' })).toBeEnabled();
  });

  it('uses "Training" as default title when editing with an empty name', async () => {
    const onSuccess = vi.fn();
    render(
      <TrainingEditDialog training={editableTraining} open onOpenChange={vi.fn()} onSuccess={onSuccess} />
    );

    fireEvent.change(screen.getByLabelText('Training Name'), { target: { value: '' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Update Training' }).closest('form'));

    await waitFor(() => {
      expect(updateTrainingMock).toHaveBeenCalledWith(
        'training-1',
        expect.objectContaining({
          title: 'Training',
        })
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('prefills the edit duration and updates it via quick chips', async () => {
    render(
      <TrainingEditDialog training={editableTraining} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(screen.getByLabelText('Duration in minutes')).toHaveTextContent('30');

    fireEvent.click(screen.getByRole('button', { name: '90m' }));
    expect(screen.getByLabelText('Duration in minutes')).toHaveTextContent('90');

    fireEvent.submit(screen.getByRole('button', { name: 'Update Training' }).closest('form'));
    await waitFor(() => {
      expect(updateTrainingMock).toHaveBeenCalledWith(
        'training-1',
        expect.objectContaining({ duration_minutes: 90 })
      );
    });
  });
});
