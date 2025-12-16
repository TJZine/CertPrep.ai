'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import type { Container } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';

/**
 * MidnightParticles - Twinkling stars effect for Midnight theme
 * 
 * Features subtle starfield with:
 * - Twinkling opacity animation
 * - Varied sizes simulating distance
 * - Minimal movement for ambient effect
 */
export default function MidnightParticles(): React.ReactElement | null {
    const [init, setInit] = useState(false);
    const containerRef = useRef<Container | null>(null);

    useEffect(() => {
        let mounted = true;

        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        })
            .then(() => {
                if (mounted) setInit(true);
            })
            .catch((err) => {
                console.error('[MidnightParticles] Failed to initialize:', err);
            });

        return (): void => {
            mounted = false;
            // Defensive cleanup: destroy container if it exists
            if (containerRef.current) {
                containerRef.current.destroy();
                containerRef.current = null;
            }
        };
    }, []);

    // Note: async is required by tsparticles API even though we don't await anything
    const particlesLoaded = useCallback(async (container?: Container): Promise<void> => {
        // Store container reference for cleanup
        if (container) {
            containerRef.current = container;
        }
    }, []);

    if (!init) {
        return null;
    }

    return (
        <Particles
            id="midnight-particles"
            aria-hidden="true"
            particlesLoaded={particlesLoaded}
            options={{
                fullScreen: {
                    enable: true,
                    zIndex: 40,
                },
                fpsLimit: 30, // Lower FPS for subtle effect
                particles: {
                    number: {
                        value: 80,
                        density: {
                            enable: true,
                            width: 1920,
                            height: 1080,
                        },
                    },
                    color: {
                        value: ['#ffffff', '#ffeaa7', '#dfe6e9', '#a29bfe'],
                    },
                    shape: {
                        type: 'circle',
                    },
                    opacity: {
                        value: { min: 0.1, max: 0.8 },
                        animation: {
                            enable: true,
                            speed: 0.5,
                            sync: false,
                        },
                    },
                    size: {
                        value: { min: 1, max: 3 },
                    },
                    move: {
                        enable: true,
                        speed: 0.1, // Very slow drift
                        direction: 'none',
                        random: true,
                        straight: false,
                        outModes: {
                            default: 'bounce',
                        },
                    },
                    twinkle: {
                        particles: {
                            enable: true,
                            frequency: 0.02,
                            opacity: 1,
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
