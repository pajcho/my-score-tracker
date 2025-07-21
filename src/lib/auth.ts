import { Profile } from './supabase-auth';

interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
}

class AuthService {
  private state: AuthState = {
    user: null,
    isAuthenticated: false
  };

  private listeners: ((state: AuthState) => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.state = {
        user: JSON.parse(storedUser),
        isAuthenticated: true
      };
    }
  }

  private saveToStorage() {
    if (this.state.user) {
      localStorage.setItem('currentUser', JSON.stringify(this.state.user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  login(user: Profile) {
    this.state = {
      user,
      isAuthenticated: true
    };
    this.saveToStorage();
    this.notifyListeners();
  }

  logout() {
    this.state = {
      user: null,
      isAuthenticated: false
    };
    this.saveToStorage();
    this.notifyListeners();
  }

  getCurrentUser(): Profile | null {
    return this.state.user;
  }

  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  getState(): AuthState {
    return this.state;
  }
}

export const auth = new AuthService();