'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session, AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { clearDatabase } from '@/db';


type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type SignOutDependencies = {
  supabase: SupabaseClient | undefined;
  router: ReturnType<typeof useRouter>;
  onResetAuthState: () => void;
  clearDb: () => Promise<void>;
};

export async function performSignOut({
  supabase,
  router,
  onResetAuthState,
  clearDb,
}: SignOutDependencies): Promise<{ success: boolean; error?: string }> {
  let dbClearError: string | undefined;
  try {
    await clearDb();
  } catch (error) {
    console.error('Failed to clear local database during sign out:', error);
    dbClearError = 'Local data could not be cleared.';
  }

  if (!supabase) {
    return { success: false, error: 'Authentication service unavailable.' };
  }

  try {
    await supabase.auth.signOut();
    onResetAuthState();
    router.push('/login');
    return { success: true, error: dbClearError };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error: 'Sign out failed. Please try again.' };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  const supabaseRef = useRef<SupabaseClient | undefined>(undefined);
  if (!supabaseRef.current) {
    // Attempt to create client; might return undefined if env vars missing
    const client = createClient();
    if (client) {
      supabaseRef.current = client;
    }
  }
  const supabase = supabaseRef.current;

  useEffect((): (() => void) => {
    let isMounted = true;

    if (!supabase) {
      if (isMounted) setIsLoading(false);
      return () => {};
    }

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

  const signOut = async (): Promise<{ success: boolean; error?: string }> =>
    performSignOut({
      supabase,
      router,
      clearDb: clearDatabase,
      onResetAuthState: () => {
        setUser(null);
        setSession(null);
      },
    });

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
