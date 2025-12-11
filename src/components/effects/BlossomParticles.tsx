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

    return (
        <Particles
            id="blossom-particles"
            options={{
                fullScreen: {
                    enable: true,
                    zIndex: 40, // Below header (z-50), above content
                },
                fpsLimit: 60,
                particles: {
                    number: {
                        value: 25, // Moderate density
                        density: {
                            enable: true,
                            width: 1920,
                            height: 1080,
                        },
                    },
                    color: {
                        value: ['#f9a8c9', '#fcd5e5', '#fff0f5', '#e8a4c0'],
                    },
                    shape: {
                        type: 'image',
                        options: {
                            image: {
                                src: '/images/sakura-petal-v2.png',
                                width: 60,
                                height: 60,
                            },
                        },
                    },
                    opacity: {
                        value: { min: 0.4, max: 0.8 },
                    },
                    size: {
                        value: { min: 12, max: 24 }, // Smaller, more delicate
                    },
                    rotate: {
                        value: { min: 0, max: 360 },
                        direction: 'random',
                        animation: {
                            enable: true,
                            speed: 2,
                            sync: false,
                        },
                    },
                    move: {
                        enable: true,
                        direction: 'bottom',
                        speed: { min: 0.5, max: 1.0 }, // Slow constant speed
                        straight: false,
                        outModes: {
                            default: 'out',
                            top: 'none',
                        },
                        gravity: {
                            enable: true,
                            acceleration: 0,
                        },
                        drift: 0, // No random drift
                    },
                    wobble: {
                        enable: false, // Disable horizontal wobble
                        distance: 0,
                        speed: 0,
                    },
                    tilt: {
                        enable: true,
                        direction: 'random',
                        value: { min: 0, max: 360 },
                        animation: {
                            enable: true,
                            speed: 5,
                            sync: false,
                        },
                    },
                },
                // Occasional sparkle particles for magic touch
                emitters: {
                    direction: 'bottom',
                    rate: {
                        quantity: 1,
                        delay: 3, // One sparkle every 3 seconds
                    },
                    position: {
                        x: 50,
                        y: 0,
                    },
                    size: {
                        width: 100,
                        height: 0,
                    },
                    particles: {
                        color: { value: '#ffffff' },
                        shape: { type: 'star' },
                        size: { value: { min: 3, max: 6 } },
                        opacity: {
                            value: { min: 0.5, max: 1 },
                            animation: { enable: true, speed: 2, sync: false }
                        },
                        move: {
                            enable: true,
                            direction: 'bottom',
                            speed: { min: 0.3, max: 1 },
                            gravity: { enable: true, acceleration: 0.1 },
                        },
                        life: {
                            duration: { value: 5 },
                            count: 1,
                        },
                    },
                },
                detectRetina: true,
                pauseOnBlur: true,
                pauseOnOutsideViewport: true,
            }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
            }}
        />
    );
}
