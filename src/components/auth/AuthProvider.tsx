import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthState, supabaseAuth } from '@/lib/supabaseAuth';
import { AuthContext } from '@/components/auth/authContext';
import { invalidateTrackerQueries } from '@/lib/queryCache';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>(() => supabaseAuth.getState());
  const previousUserIdRef = useRef<string | null>(authState.user?.id ?? null);

  const syncQueryCacheWithAuth = (nextUserId: string | null) => {
    const previousUserId = previousUserIdRef.current;
    if (previousUserId === nextUserId) {
      return;
    }

    previousUserIdRef.current = nextUserId;
    queryClient.removeQueries({ queryKey: ['tracker'] });

    if (nextUserId) {
      void invalidateTrackerQueries({
        scores: true,
        trainings: true,
        liveGames: true,
        opponents: true,
        friends: true,
      });
    }
  };

  useEffect(() => {
    return supabaseAuth.subscribe((nextAuthState) => {
      setAuthState(nextAuthState);
      syncQueryCacheWithAuth(nextAuthState.user?.id ?? null);
    });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}
