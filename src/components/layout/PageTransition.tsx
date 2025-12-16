"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/common/ThemeProvider";

type TransitionStyles = Pick<React.ComponentProps<typeof motion.div>, "initial" | "animate" | "exit" | "transition">;

export function PageTransition({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    const pathname = usePathname();
    const { resolvedTheme } = useTheme();

    // Track hydration to prevent SSR mismatch with Framer Motion
    // During SSR and initial hydration, render without animation wrapper
    const [isHydrated, setIsHydrated] = React.useState(false);

    React.useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Determine animation variant based on resolved theme (not raw theme which could be "system")
    const getVariants = (): TransitionStyles => {
        switch (resolvedTheme) {
            case "retro":
            case "retro-dark":
                // Slide / Swipe effect
                return {
                    initial: { x: 20, opacity: 0 },
                    animate: { x: 0, opacity: 1 },
                    exit: { x: -20, opacity: 0 },
                    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
                };
            case "blossom":
                // Soft Fade & Scale
                return {
                    initial: { opacity: 0, scale: 0.98 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.98 },
                    transition: { duration: 0.4, ease: "easeInOut" as const },
                };
            case "vapor":
            case "midnight":
                // Quick Tech Fade (no blur filter - breaks position:fixed in children)
                return {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    exit: { opacity: 0 },
                    transition: { duration: 0.2 },
                };
            default:
                // Default standard fade (subtle)
                return {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    exit: { opacity: 0 },
                    transition: { duration: 0.2 },
                };
        }
    };

    const variants = getVariants();

    // During SSR and initial hydration, render children without animation
    // This prevents the motion.div style mismatch between server and client
    if (!isHydrated) {
        return <div className="flex-1 w-full">{children}</div>;
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={variants.transition}
                className="flex-1 w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

