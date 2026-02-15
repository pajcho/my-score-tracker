import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class SupabaseAuthService {
  private state: AuthState = {
    user: null,
    profile: null,
    session: null,
    isAuthenticated: false,
    isLoading: true
  };

  private listeners: ((state: AuthState) => void)[] = [];

  private createStateSnapshot(): AuthState {
    return {
      ...this.state,
      profile: this.state.profile ? { ...this.state.profile } : null,
    };
  }

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Keep loading true until profile is loaded for authenticated users.
        this.state.session = session;
        this.state.user = session?.user ?? null;
        this.state.isAuthenticated = !!session?.user;

        if (session?.user) {
          this.state.isLoading = true;
          this.notifyListeners();

          // Defer Supabase calls with setTimeout to avoid deadlock
          setTimeout(() => {
            void this.loadProfile(session.user!.id).finally(() => {
              this.state.isLoading = false;
              this.notifyListeners();
            });
          }, 0);
        } else {
          this.state.profile = null;
          this.state.isLoading = false;
          this.notifyListeners();
        }
      }
    );

    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      this.state.session = session;
      this.state.user = session.user;
      this.state.isAuthenticated = true;
      this.state.isLoading = true;
      this.notifyListeners();
      await this.loadProfile(session.user.id);
      this.state.isLoading = false;
    }

    if (!session?.user) {
      this.state.isLoading = false;
    }
    this.notifyListeners();

    // Clean up subscription on page unload
    window.addEventListener('beforeunload', () => {
      subscription.unsubscribe();
    });
  }

  private async loadProfile(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      this.state.profile = profile;
      this.notifyListeners(); // Notify listeners after profile is loaded
    } catch (error) {
      console.error('Error loading profile:', error);
      this.state.profile = null;
      this.notifyListeners(); // Notify listeners even on error
    }
  }

  private notifyListeners() {
    const snapshot = this.createStateSnapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener);
    // Call immediately with current state
    listener(this.createStateSnapshot());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  async signUp(email: string, password: string, name: string) {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name
        }
      }
    });

    return { data, error };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { data, error };
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      this.state = {
        user: null,
        profile: null,
        session: null,
        isAuthenticated: false,
        isLoading: false
      };
      this.notifyListeners();
    }
    return { error };
  }

  getCurrentUser(): User | null {
    return this.state.user;
  }

  getCurrentProfile(): Profile | null {
    return this.state.profile;
  }

  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  isLoading(): boolean {
    return this.state.isLoading;
  }

  getState(): AuthState {
    return this.createStateSnapshot();
  }
}

export const supabaseAuth = new SupabaseAuthService();
