'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  seedDemo as apiSeedDemo,
  getMe,
  logout as apiLogout,
  getAuthToken,
  type AuthResponse,
} from './api';

type AuthUser = AuthResponse['data']['user'];

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; organizationName: string }) => Promise<void>;
  tryDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider
 *
 * Most backend routes still apply `optionalAuth` and work while signed out.
 * Campaigns are the exception: they're org-private, so the `(dashboard)`
 * route group (see `app/(dashboard)/layout.tsx`) redirects to `/login`
 * whenever there's no signed-in user, and campaign API calls always carry a
 * Bearer token as a result.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    getMe()
      .then((res) => setUser(res.data))
      .catch(() => {
        // Expired/invalid token — clear it so we don't keep retrying.
        apiLogout();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setUser(res.data.user);
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; name: string; organizationName: string }) => {
      const res = await apiRegister(data);
      setUser(res.data.user);
    },
    []
  );

  const tryDemo = useCallback(async () => {
    const res = await apiSeedDemo();
    setUser(res.data.user);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, tryDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
