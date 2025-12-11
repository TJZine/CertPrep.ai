'use client';

import { useEffect, useState, useCallback } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
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

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const particlesLoaded = useCallback(async (): Promise<void> => {
        // Stars loaded
    }, []);

    if (!init) {
        return null;
    }

    return (
        <Particles
            id="midnight-particles"
            particlesLoaded={particlesLoaded}
            options={{
                fullScreen: {
                    enable: true,
                    zIndex: 1, // Behind content for starfield
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
