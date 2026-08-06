import { create } from 'zustand';
import { UserDto } from '@codesphere/shared';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  isLoading: boolean;
  setAuth: (user: UserDto, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  setAuth: (user, accessToken) => set({ user, accessToken, isLoading: false }),

  setAccessToken: (accessToken) => set({ accessToken }),

  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      // Ignore network errors during logout
    }
    set({ user: null, accessToken: null, isLoading: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    // Try refresh token from cookie first
    const refreshed = await get().refreshToken();
    set({ isLoading: false });
    return refreshed;
  },

  refreshToken: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        set({ user: null, accessToken: null });
        return false;
      }

      const data = await response.json();
      set({ user: data.user, accessToken: data.accessToken });
      return true;
    } catch (err) {
      set({ user: null, accessToken: null });
      return false;
    }
  }
}));
