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

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/lib/supabase-auth', () => ({
  supabaseAuth: {
    isAuthenticated: isAuthenticatedMock,
  },
}));

vi.mock('@/lib/supabase-database', () => ({
  supabaseDb: {
    createTraining: createTrainingMock,
    updateTraining: updateTrainingMock,
  },
}));

vi.mock('@/lib/query-cache', () => ({
  invalidateTrackerQueries: invalidateTrackerQueriesMock,
}));

vi.mock('@/hooks/use-mobile', () => ({
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

vi.mock('@/components/ui/toggle-group', () => ({
  ToggleGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
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

describe('Training default title', () => {
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

    fireEvent.change(screen.getByLabelText('Total Duration (minutes) *'), { target: { value: '45' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Save Training' }).closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(createTrainingMock).toHaveBeenCalledWith(
        expect.any(String),
        'Training',
        expect.any(String),
        45,
        ''
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('prefills create duration via quick fill links', () => {
    render(<TrainingForm onCancel={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('link', { name: '60m' }));

    expect(screen.getByLabelText('Total Duration (minutes) *')).toHaveValue(60);
  });

  it('uses "Training" as default title when editing with an empty name', async () => {
    const onSuccess = vi.fn();
    render(
      <TrainingEditDialog
        training={{
          id: 'training-1',
          user_id: 'user-1',
          game: 'Pool',
          title: 'Initial title',
          training_date: '2026-02-15',
          duration_minutes: 30,
          notes: null,
          created_at: '2026-02-15T00:00:00.000Z',
          updated_at: '2026-02-15T00:00:00.000Z',
        }}
        open
        onOpenChange={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText('Training Name'), { target: { value: '' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Update Training' }).closest('form') as HTMLFormElement);

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

  it('prefills edit duration via quick fill links', () => {
    render(
      <TrainingEditDialog
        training={{
          id: 'training-1',
          user_id: 'user-1',
          game: 'Pool',
          title: 'Initial title',
          training_date: '2026-02-15',
          duration_minutes: 30,
          notes: null,
          created_at: '2026-02-15T00:00:00.000Z',
          updated_at: '2026-02-15T00:00:00.000Z',
        }}
        open
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: '90m' }));

    expect(screen.getByLabelText('Total Duration (minutes) *')).toHaveValue(90);
  });
});
