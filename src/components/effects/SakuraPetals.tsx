'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useTheme } from '@/components/common/ThemeProvider';

/**
 * Individual petal configuration generated at component mount
 */
interface PetalConfig {
    id: number;
    startX: number; // 0-100 (percentage across viewport)
    size: number; // px (25-55)
    rotation: number; // degrees (0-360)
    duration: number; // seconds (14-24)
    delay: number; // seconds (0 to -duration, negative for staggered start)
    swayAmount: number; // px horizontal drift (20-50)
    opacity: number; // 0.5-0.9
}

/**
 * Generates randomized petal configurations
 * Uses seeded-like distribution for consistent spacing
 */
function generatePetals(count: number): PetalConfig[] {
    const petals: PetalConfig[] = [];

    for (let i = 0; i < count; i++) {
        // Distribute X positions across viewport with some randomness
        const baseX = (i / count) * 100;
        const offsetX = (Math.random() - 0.5) * 20; // ±10% variance

        petals.push({
            id: i,
            startX: Math.max(0, Math.min(100, baseX + offsetX)),
            size: 25 + Math.random() * 30, // 25-55px
            rotation: Math.random() * 360,
            duration: 14 + Math.random() * 10, // 14-24s
            delay: -Math.random() * 20, // Staggered starts
            swayAmount: 20 + Math.random() * 30, // 20-50px
            opacity: 0.5 + Math.random() * 0.4, // 0.5-0.9
        });
    }

    return petals;
}

/**
 * Hook to check for prefers-reduced-motion using useSyncExternalStore
 */
function useReducedMotion(): boolean {
    return useSyncExternalStore(
        (callback) => {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            mediaQuery.addEventListener('change', callback);
            return (): void => mediaQuery.removeEventListener('change', callback);
        },
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        () => false // Server-side default
    );
}

/**
 * SakuraPetals - Renders individual falling sakura petals for the Blossom theme
 * 
 * Each petal is an absolutely positioned image with its own animation timing,
 * creating an organic, non-synchronized falling effect.
 * 
 * Only renders when Blossom theme is active.
 * Respects prefers-reduced-motion for accessibility.
 */
export function SakuraPetals(): React.ReactElement | null {
    const { theme } = useTheme();
    const reducedMotion = useReducedMotion();

    // Generate petal configs once on mount (stable across re-renders)
    const petals = useMemo(() => generatePetals(20), []);

    // Only render for Blossom theme and if motion is allowed
    if (theme !== 'blossom' || reducedMotion) {
        return null;
    }

    // Container styles - MUST be fixed position to overlay content
    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
        overflow: 'hidden',
    };

    return (
        <div
            style={containerStyle}
            aria-hidden="true"
            role="presentation"
        >
            {petals.map((petal) => {
                // Per-petal animation using CSS custom properties
                const petalStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${petal.startX}%`,
                    top: '-60px', // Start above viewport
                    width: `${petal.size}px`,
                    height: `${petal.size}px`,
                    opacity: petal.opacity,
                    animation: `sakura-fall ${petal.duration}s linear infinite`,
                    animationDelay: `${petal.delay}s`,
                    // Pass sway amount to keyframe via CSS custom property
                    ['--sway-amount' as string]: `${petal.swayAmount}px`,
                    willChange: 'transform',
                };

                const imgStyle: React.CSSProperties = {
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transform: `rotate(${petal.rotation}deg)`,
                    filter: 'drop-shadow(0 2px 6px rgba(249, 168, 201, 0.4))',
                };

                return (
                    <div key={petal.id} style={petalStyle}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/sakura-petal-v2.png"
                            alt=""
                            style={imgStyle}
                            draggable={false}
                        />
                    </div>
                );
            })}
        </div>
    );
}
