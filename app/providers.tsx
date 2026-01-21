'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { useRouter, usePathname } from 'next/navigation';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const publicPaths = ['/login', '/register'];
    const safePathname: string = pathname ?? '';
    if (!user && !publicPaths.includes(safePathname)) {
      router.push('/login');
    }
  }, [user, pathname, router]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <AppContext.Provider value={{ user, setUser, isDarkMode, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}
