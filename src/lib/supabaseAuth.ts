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

// Profile cache lets a cold start (or an app resume after the phone was
// locked) render the app immediately instead of gating the whole UI on a
// network round-trip; the profile still refreshes in the background.
const PROFILE_CACHE_KEY = 'score-tracker-profile';

function readCachedProfile(userId: string): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as Profile;
    return profile?.user_id === userId ? profile : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: Profile | null) {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch {
    // localStorage unavailable — the cache is best-effort only.
  }
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

  // Dedupes concurrent profile fetches — the startup getSession() call and
  // the INITIAL_SESSION/SIGNED_IN auth event both ask for the same profile.
  private profileRefresh: { userId: string; promise: Promise<void> } | null = null;

  private createStateSnapshot(): AuthState {
    return {
      ...this.state,
      profile: this.state.profile ? { ...this.state.profile } : null,
    };
  }

  constructor() {
    void this.initialize();
  }

  private async initialize() {
    // Set up auth state listener. TOKEN_REFRESHED fires every time the app
    // resumes from background — it must not gate the UI behind a network
    // fetch, so isLoading only turns on when no profile is known at all.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        this.state.session = session;
        this.state.user = session?.user ?? null;
        this.state.isAuthenticated = !!session?.user;

        if (session?.user) {
          const userId = session.user.id;
          this.applyKnownProfile(userId);
          this.notifyListeners();

          // Defer Supabase calls with setTimeout to avoid deadlock
          setTimeout(() => {
            void this.refreshProfile(userId);
          }, 0);
        } else {
          this.state.profile = null;
          this.state.isLoading = false;
          writeCachedProfile(null);
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
      this.applyKnownProfile(session.user.id);
      this.notifyListeners();
      await this.refreshProfile(session.user.id);
    } else {
      this.state.isLoading = false;
      this.notifyListeners();
    }

    // Clean up subscription on page unload
    window.addEventListener('beforeunload', () => {
      subscription.unsubscribe();
    });
  }

  // Reuse the in-memory or localStorage-cached profile so returning users
  // never see the auth loading gate; only a first sign-in on this device
  // (no profile anywhere) keeps isLoading on until the fetch lands.
  private applyKnownProfile(userId: string) {
    if (this.state.profile?.user_id !== userId) {
      this.state.profile = readCachedProfile(userId);
    }
    this.state.isLoading = !this.state.profile;
  }

  private refreshProfile(userId: string): Promise<void> {
    if (this.profileRefresh?.userId === userId) {
      return this.profileRefresh.promise;
    }

    const promise = this.loadProfile(userId).finally(() => {
      if (this.profileRefresh?.promise === promise) {
        this.profileRefresh = null;
      }
      if (this.state.user?.id === userId && this.state.isLoading) {
        this.state.isLoading = false;
        this.notifyListeners();
      }
    });
    this.profileRefresh = { userId, promise };
    return promise;
  }

  private async loadProfile(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (this.state.user?.id === userId) {
        this.state.profile = profile;
        writeCachedProfile(profile);
        this.notifyListeners(); // Notify listeners after profile is loaded
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Keep any already-known profile — a transient network failure on app
      // resume must not blank out the signed-in UI.
      if (this.state.profile?.user_id !== userId) {
        this.state.profile = null;
        this.notifyListeners(); // Notify listeners even on error
      }
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
      writeCachedProfile(null);
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
