import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthState, supabaseAuth } from '@/lib/supabaseAuth';
import { AuthContext } from '@/components/auth/authContext';
import { invalidateTrackerQueries } from '@/lib/queryCache';

// Survives reloads so a cold start resolving to the same account keeps the
// persisted query cache — wiping on the transient null → user transition
// would defeat the 24h localStorage persistence of live score data.
const LAST_USER_KEY = 'score-tracker-last-user';

function readLastUserId(): string | null {
  try {
    return localStorage.getItem(LAST_USER_KEY);
  } catch {
    return null;
  }
}

function writeLastUserId(userId: string | null) {
  try {
    if (userId) {
      localStorage.setItem(LAST_USER_KEY, userId);
    } else {
      localStorage.removeItem(LAST_USER_KEY);
    }
  } catch {
    // localStorage unavailable — worst case the cache is wiped on next login.
  }
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>(() => supabaseAuth.getState());

  useEffect(() => {
    const syncQueryCacheWithAuth = (nextAuthState: AuthState) => {
      const nextUserId = nextAuthState.user?.id ?? null;

      if (!nextUserId) {
        // While auth is still resolving the user is briefly null — only an
        // actual signed-out state may clear the cached data.
        if (!nextAuthState.isLoading && readLastUserId()) {
          writeLastUserId(null);
          queryClient.removeQueries({ queryKey: ['tracker'] });
        }
        return;
      }

      const previousUserId = readLastUserId();
      if (previousUserId === nextUserId) {
        return;
      }

      writeLastUserId(nextUserId);
      if (previousUserId) {
        // A different account signed in on this device — drop its data.
        queryClient.removeQueries({ queryKey: ['tracker'] });
      }

      void invalidateTrackerQueries({
        scores: true,
        trainings: true,
        liveGames: true,
        opponents: true,
        friends: true,
      });
    };

    return supabaseAuth.subscribe((nextAuthState) => {
      setAuthState(nextAuthState);
      syncQueryCacheWithAuth(nextAuthState);
    });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}
