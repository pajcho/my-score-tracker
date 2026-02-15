import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useIsMobileMock } = vi.hoisted(() => ({
  useIsMobileMock: vi.fn(),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => useIsMobileMock(),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-root">{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div data-testid="drawer-root">{children}</div>,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div data-testid="drawer-content">{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="drawer-header">{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { ResponsiveFormModal } from '@/components/ui/responsive-form-modal';

describe('ResponsiveFormModal', () => {
  it('renders dialog variant on desktop', () => {
    useIsMobileMock.mockReturnValue(false);

    render(
      <ResponsiveFormModal open onOpenChange={() => undefined} title="Desktop Title" description="Desktop description">
        <div>Desktop content</div>
      </ResponsiveFormModal>
    );

    expect(screen.getByTestId('dialog-root')).toBeInTheDocument();
    expect(screen.queryByTestId('drawer-root')).not.toBeInTheDocument();
    expect(screen.getByText('Desktop Title')).toBeInTheDocument();
    expect(screen.getByText('Desktop description')).toBeInTheDocument();
    expect(screen.getByText('Desktop content')).toBeInTheDocument();
  });

  it('renders drawer variant on mobile', () => {
    useIsMobileMock.mockReturnValue(true);

    render(
      <ResponsiveFormModal open onOpenChange={() => undefined} title="Mobile Title" description="Mobile description">
        <div>Mobile content</div>
      </ResponsiveFormModal>
    );

    expect(screen.getByTestId('drawer-root')).toBeInTheDocument();
    expect(screen.queryByTestId('dialog-root')).not.toBeInTheDocument();
    expect(screen.getByText('Mobile Title')).toBeInTheDocument();
    expect(screen.getByText('Mobile description')).toBeInTheDocument();
    expect(screen.getByText('Mobile content')).toBeInTheDocument();
  });

  it('omits description when not provided', () => {
    useIsMobileMock.mockReturnValue(false);

    render(
      <ResponsiveFormModal open onOpenChange={() => undefined} title="No description">
        <div>Body</div>
      </ResponsiveFormModal>
    );

    expect(screen.getByText('No description')).toBeInTheDocument();
    expect(screen.queryByText('Desktop description')).not.toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});
