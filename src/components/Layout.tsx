import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { LiveGameInviteNotifier } from '@/components/scores/LiveGameInviteNotifier';
import { useAuth } from '@/components/auth/authContext';
import { useIsKeyboardOpen } from '@/hooks/useIsKeyboardOpen';
import { useLiveGamesQuery } from '@/hooks/useTrackerData';
import { cn } from '@/lib/utils';

const LIVE_LAUNCH_SESSION_KEY = 'score-tracker-live-launch-checked';
// Only redirect if live-game data arrives this soon after mount. Later
// arrivals mean the user is already reading Home — yanking them then
// would feel like a glitch, not a launch behavior.
const LIVE_LAUNCH_WINDOW_MS = 3000;

/**
 * On cold launch, land on /live when the user has active games — the
 * evening ritual starts there. Runs once per browser session; navigating
 * back Home afterwards always sticks.
 */
function useLaunchIntoLive() {
  const authState = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mountedAtRef = useRef<number | null>(null);
  const currentUserId = authState.isAuthenticated ? authState.user?.id : undefined;
  const liveGamesQuery = useLiveGamesQuery(currentUserId);
  const liveGames = liveGamesQuery.data;

  useEffect(() => {
    mountedAtRef.current ??= Date.now();
  }, []);

  useEffect(() => {
    if (!currentUserId || !liveGames) return;
    if (sessionStorage.getItem(LIVE_LAUNCH_SESSION_KEY)) return;

    sessionStorage.setItem(LIVE_LAUNCH_SESSION_KEY, '1');

    if (location.pathname !== '/') return;
    if (Date.now() - (mountedAtRef.current ?? Date.now()) > LIVE_LAUNCH_WINDOW_MS) return;

    const hasOwnActiveGames = liveGames.some(
      (liveGame) =>
        liveGame.created_by_user_id === currentUserId || liveGame.opponent_user_id === currentUserId
    );
    if (hasOwnActiveGames) {
      navigate('/live', { replace: true });
    }
  }, [currentUserId, liveGames, location.pathname, navigate]);
}

export function Layout() {
  const authState = useAuth();
  useLaunchIntoLive();
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
