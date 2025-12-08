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
    const { theme } = useTheme();

    // Determine animation variant based on theme
    const getVariants = (): TransitionStyles => {
        switch (theme) {
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
                // Quick Tech Fade
                return {
                    initial: { opacity: 0, filter: "blur(4px)" },
                    animate: { opacity: 1, filter: "blur(0px)" },
                    exit: { opacity: 0, filter: "blur(4px)" },
                    transition: { duration: 0.2 },
                };
            case "ocean":
                // Slow gentle fade
                return {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    exit: { opacity: 0 },
                    transition: { duration: 0.6, ease: "easeOut" as const },
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
