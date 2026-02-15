import { createContext, useContext } from 'react';
import { AuthState } from '@/lib/supabaseAuth';

export const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
