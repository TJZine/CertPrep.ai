"use client";

import * as React from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ZenQuizContainer } from "@/components/quiz/ZenQuizContainer";
import { loadInterleavedState, clearInterleavedState } from "@/lib/interleavedStorage";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

/**
 * Interleaved Practice session page.
 * Loads session from sessionStorage and renders ZenQuizContainer.
 */
export default function InterleavedSessionPage(): React.ReactElement {
    const router = useRouter();
    const { user } = useAuth();
    const effectiveUserId = useEffectiveUserId(user?.id);

    // Load session state synchronously during render (sessionStorage is sync)
    const sessionState = useMemo(() => {
        if (typeof window === "undefined") return null;
        return loadInterleavedState();
    }, []);

    const quiz = sessionState?.quiz ?? null;
    const sourceMap = useMemo(() => {
        if (!sessionState?.sourceMap) return null;
        return new Map(Object.entries(sessionState.sourceMap));
    }, [sessionState?.sourceMap]);
    const keyMappings = useMemo(() => {
        if (!sessionState?.keyMappings) return null;
        return new Map(Object.entries(sessionState.keyMappings));
    }, [sessionState?.keyMappings]);

    if (!effectiveUserId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <p className="text-muted-foreground">
                    Please log in to continue your practice session.
                </p>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
                <p className="text-muted-foreground">
                    No active interleaved session found.
                </p>
                <button
                    onClick={() => {
                        clearInterleavedState();
                        router.push("/interleaved");
                    }}
                    className="text-primary hover:underline"
                >
                    Start a new session
                </button>
            </div>
        );
    }

    return (
        <ZenQuizContainer
            quiz={quiz}
            isInterleaved={true}
            interleavedSourceMap={sourceMap}
            interleavedKeyMappings={keyMappings}
        />
    );
}

