'use client';

import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
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

    return null; // Disabled by user request

    return (
        <Particles
            id="blossom-particles"
            options={{
                fullScreen: {
                    enable: true,
                    zIndex: 0, // Deep background
                },
                fpsLimit: 60,
                particles: {
                    number: {
                        value: 12, // Very few, large shapes
                        density: { enable: true, width: 800, height: 800 },
                    },
                    color: {
                        value: ["#ffc0cb", "#ffd700", "#ffb7b2"], // Pink, Gold, Soft Coral
                    },
                    shape: {
                        type: "circle",
                    },
                    opacity: {
                        value: { min: 0.1, max: 0.3 }, // Very subtle
                        animation: {
                            enable: true,
                            speed: 0.5,
                            sync: false,
                            destroy: "none",
                        },
                    },
                    size: {
                        value: { min: 50, max: 150 }, // Giant bokeh
                        animation: {
                            enable: true,
                            speed: 2,
                            sync: false,
                            destroy: "none",
                        },
                    },
                    move: {
                        enable: true,
                        speed: 0.5, // Almost static
                        direction: "none",
                        random: true,
                        straight: false,
                        outModes: { default: "bounce" },
                    },
                },
                detectRetina: true,
            }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                filter: 'blur(20px)', // CSS Blur for true bokeh effect
                opacity: 0.6,
            }}
        />
    );
}
