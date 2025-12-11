'use client';

import { useEffect, useState } from 'react';
import { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { loadEmittersPlugin } from '@tsparticles/plugin-emitters';

/**
 * BlossomParticles - Premium sakura petal particle effect for Blossom theme
 * 
 * Uses tsparticles for professional-grade physics including:
 * - Gravity and wind effects
 * - Natural rotation and tumbling
 * - Varied sizes and opacity
 * 
 * This component is dynamically imported only when Blossom theme is active,
 * ensuring zero bundle impact on other themes.
 */
export default function BlossomParticles(): React.ReactElement | null {
    const [init, setInit] = useState(false);
    const [error, setError] = useState(false);

    // Reduced motion check (safe for SSR)
    const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Initialize tsparticles engine once (slim + emitters for sparkle effects)
    useEffect(() => {
        if (prefersReducedMotion) return;

        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
            await loadEmittersPlugin(engine);
        })
            .then(() => {
                setInit(true);
            })
            .catch((err) => {
                console.error("[BlossomParticles] Failed to initialize particles:", err);
                setError(true);
            });
    }, [prefersReducedMotion]);

    if (!init || error || prefersReducedMotion) {
        return null;
    }

    // Effect disabled by user request - restore when Blossom theme requires particles
    return null;
}
