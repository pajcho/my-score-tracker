import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { LiveGameInviteNotifier } from '@/components/scores/LiveGameInviteNotifier';
import { useAuth } from '@/components/auth/auth-context';

export function Layout() {
  const authState = useAuth();

  if (authState.isLoading) {
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
