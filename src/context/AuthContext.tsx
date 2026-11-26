import React, { createContext, useCallback, useContext, useState } from 'react';
import { api, setAuthToken } from '../lib/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, readingInterest?: string) => Promise<User>;
  adminLogin: (email: string, password: string) => Promise<User>;
  claimAdmin: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, readingInterest?: string) => {
      const res = await api.register({ name, email, password, readingInterest });
      setAuthToken(res.token);
      setUser(res.user);
      return res.user;
    },
    []
  );

  const adminLogin = useCallback(async (email: string, password: string) => {
    const res = await api.adminLogin({ email, password });
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const claimAdmin = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.claimAdmin({ name, email, password });
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, adminLogin, claimAdmin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return ctx;
}
