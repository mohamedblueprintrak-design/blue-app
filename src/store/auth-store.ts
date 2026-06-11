import { create } from "zustand";
import { getRolePermissions } from "@/lib/auth/modules/authorization";
import { Permission } from "@/lib/auth/types";
import { queryClient } from "@/components/providers/react-query-provider";
import { getMutationHeaders } from "@/lib/csrf-client";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
  phone?: string;
  department?: string;
  position?: string;
  isActive?: boolean;
  organizationId?: string | null;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  department?: string;
  position?: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  updateUser: (data: Partial<User>) => void;
  refreshSession: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: string[] | string) => boolean;
  stopAutoRefresh: () => void;
}

// SECURITY: Removed persist() middleware — user data (email, role, organizationId)
// was being stored in localStorage, making it accessible to XSS attacks.
// Session data is now fetched from /api/auth/session (httpOnly cookie) on every page load.
export const useAuthStore = create<AuthStore>()(
  (set, get) => ({
    user: null,
    isAuthenticated: false,
    isInitialized: false,
    isLoading: false,
    login: (user) => {
      // No manual cookie setting — server sets httpOnly cookie
      set({
        user,
        isAuthenticated: true,
        isInitialized: true,
      });
    },
    logout: async () => {
      // Clear httpOnly cookie via server endpoint
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: getMutationHeaders(),
          credentials: 'include',
        });
      } catch {
        // Network error — clear local state anyway
      }
      queryClient.clear();
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    },
    register: async (data) => {
      set({ isLoading: true });
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: getMutationHeaders(),
          credentials: 'include',
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.success && result.user) {
          set({ user: result.user, isAuthenticated: true, isLoading: false, isInitialized: true });
          return { success: true };
        }
        set({ isLoading: false, isInitialized: true });
        return { success: false, error: result.error?.message || 'Registration failed' };
      } catch {
        set({ isLoading: false, isInitialized: true });
        return { success: false, error: 'Network error' };
      }
    },
    updateUser: (data) =>
      set((state) => ({
        user: state.user ? { ...state.user, ...data } : null,
      })),
    refreshSession: async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
        });
        const result = await response.json();
        if (result.success && result.isAuthenticated && result.user) {
          set({ user: result.user, isAuthenticated: true, isInitialized: true });
        } else {
          set({ user: null, isAuthenticated: false, isInitialized: true });
        }
      } catch {
        // Session check failed silently
        set({ isInitialized: true });
      }
    },
    hasPermission: (permission: string) => {
      const { user } = get();
      if (!user) return false;
      if (user.role === 'ADMIN' || user.role === 'admin') return true;
      try {
        const rolePerms = getRolePermissions(user.role);
        return rolePerms.includes(permission as Permission);
      } catch {
        return false;
      }
    },
    hasRole: (roles: string[] | string) => {
      const { user } = get();
      if (!user) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.some(r => r.toUpperCase() === user.role.toUpperCase());
    },
    stopAutoRefresh: () => {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
      }
    },
  })
);

// Auto-refresh: poll /api/auth/session every 4 minutes while authenticated
let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

useAuthStore.subscribe((state) => {
  if (state.isAuthenticated && !refreshIntervalId) {
    refreshIntervalId = setInterval(() => {
      useAuthStore.getState().refreshSession();
    }, 240000);
  } else if (!state.isAuthenticated && refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
});

// Initialize store from httpOnly cookie via /api/auth/session
// Called from CsrfProvider after initAuthFetch() to avoid race condition
export function initAuthStore(): void {
  useAuthStore.getState().refreshSession();
}
