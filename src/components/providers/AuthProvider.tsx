"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import {
  User,
  Session,
  AuthChangeEvent,
  SupabaseClient,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { clearDatabase } from "@/db";
import { requestServiceWorkerCacheClear } from "@/lib/serviceWorkerClient";
import { syncQuizzes } from "@/lib/sync/quizSyncManager";
import { syncResults } from "@/lib/sync/syncManager";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type SignOutDependencies = {
  supabase: SupabaseClient | undefined;
  onResetAuthState: () => void;
  clearDb: () => Promise<void>;
  userId?: string;
};

/**
 * Signs out the user, optionally syncing data and clearing local storage.
 * @returns An object with success (true if sign-out completed) and error (set if local cleanup failed).
 * Note: success can be true even with an error if sign-out succeeded but cleanup failed.
 */
export async function performSignOut({
  supabase,
  onResetAuthState,
  clearDb,
  userId,
}: SignOutDependencies): Promise<{ success: boolean; error?: string }> {
  let dbClearError: string | undefined;

  // Attempt to flush local changes to server before clearing DB
  if (userId) {
    try {
      // We give the sync 3 seconds to finish. If it takes longer, we proceed anyway
      // to avoid trapping the user in a "signing out..." limbo.
      const syncPromise = Promise.allSettled([
        syncQuizzes(userId),
        syncResults(userId),
      ]);
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
      await Promise.race([syncPromise, timeoutPromise]);
    } catch (error) {
      console.warn("Pre-logout sync failed or timed out:", error);
      // We intentionally ignore errors here to ensure signOut proceeds
    }
  }

  try {
    void requestServiceWorkerCacheClear();
    await clearDb();
  } catch (error) {
    console.error("Failed to clear local database during sign out:", error);
    dbClearError = "Local data could not be cleared.";
  }

  if (!supabase) {
    return { success: false, error: "Authentication service unavailable." };
  }

  try {
    await supabase.auth.signOut();
    onResetAuthState();
    // Navigation is handled by the onAuthStateChange listener to support cross-tab signouts
    return { success: true, error: dbClearError };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error: "Sign out failed. Please try again." };
  }
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

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
        console.error("Failed to get session:", error);
        // Fallback to cleared state
        if (!isMounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        if (_event === "SIGNED_OUT") {
          router.push("/login");
        }
      },
    );

    void setData();

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  const signOut = async (): Promise<{ success: boolean; error?: string }> =>
    performSignOut({
      supabase,
      clearDb: clearDatabase,
      onResetAuthState: () => {
        setUser(null);
        setSession(null);
      },
      userId: user?.id,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
