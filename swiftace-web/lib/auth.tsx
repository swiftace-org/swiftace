'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import pb from './pocketbase';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    if (pb.authStore.isValid) {
      setUser(pb.authStore.model as User);
    }
    setLoading(false);

    // Listen for auth changes
    pb.authStore.onChange((auth) => {
      setUser(auth.model as User | null);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const authData = await pb.collection('users').authWithPassword(email, password);
    setUser(authData.record as User);
  };

  const register = async (email: string, password: string, name: string) => {
    const userData = {
      email,
      password,
      passwordConfirm: password,
      name,
      role: 'student'
    };

    await pb.collection('users').create(userData);
    await login(email, password);
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}