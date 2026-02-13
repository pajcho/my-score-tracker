import { useEffect, useState } from 'react';
import { AuthState, supabaseAuth } from '@/lib/supabase-auth';
import { AuthContext } from '@/components/auth/auth-context';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(() => supabaseAuth.getState());

  useEffect(() => {
    return supabaseAuth.subscribe((nextAuthState) => {
      setAuthState(nextAuthState);
    });
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}
