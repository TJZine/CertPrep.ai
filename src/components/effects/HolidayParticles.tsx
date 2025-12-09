'use client';

import { useEffect, useState, useCallback } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

/**
 * HolidayParticles - Subtle snowfall effect for Holiday theme
 * 
 * Features gentle, natural-looking snow:
 * - White/light blue snowflakes only
 * - Subtle size and opacity variation
 * - Natural drift and wobble
 * - Low particle count for ambient feel
 */
export default function HolidayParticles(): React.ReactElement | null {
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const particlesLoaded = useCallback(async (): Promise<void> => {
        // Snowflakes loaded
    }, []);

    if (!init) {
        return null;
    }

    return (
        <Particles
            id="holiday-particles"
            particlesLoaded={particlesLoaded}
            options={{
                fullScreen: {
                    enable: true,
                    zIndex: 40,
                },
                fpsLimit: 60,
                particles: {
                    number: {
                        value: 35, // Subtle, not overwhelming
                        density: {
                            enable: true,
                            width: 1920,
                            height: 1080,
                        },
                    },
                    // White/light blue snow only
                    color: {
                        value: ['#ffffff', '#f0f8ff', '#e8f4fc'],
                    },
                    shape: {
                        type: 'circle', // Simple circles, not stars
                    },
                    opacity: {
                        value: { min: 0.3, max: 0.7 },
                    },
                    size: {
                        value: { min: 2, max: 5 },
                    },
                    move: {
                        enable: true,
                        direction: 'bottom',
                        speed: { min: 0.3, max: 1.5 },
                        straight: false,
                        outModes: {
                            default: 'out',
                            top: 'none',
                        },
                        gravity: {
                            enable: true,
                            acceleration: 0.05,
                        },
                        drift: {
                            min: -0.3,
                            max: 0.3,
                        },
                    },
                    wobble: {
                        enable: true,
                        distance: 8,
                        speed: 4,
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


