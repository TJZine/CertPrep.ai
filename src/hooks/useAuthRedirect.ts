"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to redirect authenticated users away from auth pages (login/signup).
 * Includes a bypass for development/testing via ?debug_auth=true query param.
 */
export function useAuthRedirect(destination: string = "/"): {
    isLoading: boolean;
    isRedirecting: boolean;
} {
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    useEffect(() => {
        const checkSession = async (): Promise<void> => {
            // Allow developers to bypass redirect for testing UI states
            if (searchParams?.get("debug_auth") === "true") {
                setIsLoading(false);
                return;
            }

            if (!supabase) {
                setIsLoading(false);
                return;
            }

            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (session) {
                    setIsRedirecting(true);
                    router.replace(destination);
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                setIsLoading(false);
            }
        };

        checkSession();
    }, [supabase, router, destination, searchParams]);

    return { isLoading, isRedirecting };
}
