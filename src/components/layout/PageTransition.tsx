"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/common/ThemeProvider";

export function PageTransition({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    const pathname = usePathname();
    const { resolvedTheme } = useTheme();

    const animationClass =
        resolvedTheme === "blossom"
            ? "animate-in fade-in zoom-in-95 duration-300"
            : resolvedTheme === "retro" || resolvedTheme === "retro-dark"
                ? "animate-in fade-in slide-in-from-right-2 duration-200"
                : "animate-in fade-in duration-150";

    return (
        <div key={pathname} className={`flex-1 w-full ${animationClass}`}>
            {children}
        </div>
    );
}
