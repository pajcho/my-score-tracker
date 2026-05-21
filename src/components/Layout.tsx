import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { LiveGameInviteNotifier } from '@/components/scores/LiveGameInviteNotifier';
import { useAuth } from '@/components/auth/authContext';
import { useIsKeyboardOpen } from '@/hooks/useIsKeyboardOpen';
import { cn } from '@/lib/utils';

export function Layout() {
  const authState = useAuth();
  // When the on-screen keyboard opens we hide the mobile bottom nav
  // (see Navigation.tsx). At that point the `pb-24` clearance reserved
  // for the nav becomes empty whitespace iOS leaves visible above the
  // keyboard after scrolling the focused input into view. Drop the
  // padding while typing so the page collapses to the input's natural
  // bottom.
  const isKeyboardOpen = useIsKeyboardOpen();

  // Only show loading screen on initial load when there's no profile data yet.
  // During background refetches (refetchOnMount, refetchOnFocus), the existing data
  // remains visible even if isLoading is true.
  if (authState.isLoading && !authState.profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <LiveGameInviteNotifier />
      <main
        className={cn(
          'container mx-auto px-4 py-8 md:pb-8',
          isKeyboardOpen ? 'pb-8' : 'pb-24',
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
