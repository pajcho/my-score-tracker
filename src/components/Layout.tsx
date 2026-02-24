import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { LiveGameInviteNotifier } from '@/components/scores/LiveGameInviteNotifier';
import { useAuth } from '@/components/auth/authContext';

export function Layout() {
  const authState = useAuth();

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
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
