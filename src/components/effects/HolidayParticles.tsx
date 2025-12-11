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
                        value: 120, // Constant target count
                        density: {
                            enable: true,
                            width: 1920,
                            height: 1080,
                        },
                    },
                    // White/light blue snow only
                    color: {
                        value: ['#ffffff', '#f0f8ff', '#e8f4fc', '#dbeafe'],
                    },
                    shape: {
                        type: 'circle',
                    },
                    opacity: {
                        value: { min: 0.5, max: 0.9 },
                    },
                    size: {
                        value: { min: 0.5, max: 2 }, // Small, subtle dots
                    },
                    move: {
                        enable: true,
                        direction: 'bottom',
                        speed: { min: 0.4, max: 1.0 }, // Slower, gentler fall
                        straight: false,
                        outModes: {
                            default: 'out',
                        },
                        gravity: {
                            enable: false,
                        },
                        drift: {
                            min: 0,
                            max: 0, // No horizontal drift at all
                        },
                    },
                    wobble: {
                        enable: true,
                        distance: 1, // Very minimal wobble
                        speed: 0.5, // Slow wobble
                    },
                },
                detectRetina: true,
                pauseOnBlur: false, // Keep snowing even when tab not focused
                pauseOnOutsideViewport: false,
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


