'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { clearDatabase } from '@/db';


type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect((): (() => void) => {
    let isMounted = true;

    const setData = async (): Promise<void> => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Failed to get session:', error);
        // Fallback to cleared state
        if (!isMounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (_event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    void setData();

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  const signOut = async (): Promise<void> => {
    try {
      // Clear local data first to ensure privacy even if network fails
      await clearDatabase();
    } catch (error) {
      console.error('Failed to clear local database during sign out:', error);
    }

    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    session,
    user,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
