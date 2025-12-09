'use client';

import { useEffect, useState, useCallback } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

/**
 * HolidayParticles - Snowfall effect for Holiday theme
 * 
 * Features gentle falling snowflakes with:
 * - Varied sizes for depth perception
 * - Subtle horizontal drift
 * - Natural opacity variation
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
                        value: 50, // Dense snowfall
                        density: {
                            enable: true,
                            width: 1920,
                            height: 1080,
                        },
                    },
                    color: {
                        value: ['#ffffff', '#e8f4fc', '#d4e9f7'],
                    },
                    shape: {
                        type: 'circle',
                    },
                    opacity: {
                        value: { min: 0.3, max: 0.8 },
                    },
                    size: {
                        value: { min: 2, max: 6 },
                    },
                    move: {
                        enable: true,
                        direction: 'bottom',
                        speed: { min: 0.5, max: 2 },
                        straight: false,
                        outModes: {
                            default: 'out',
                            top: 'none',
                        },
                        gravity: {
                            enable: true,
                            acceleration: 0.1,
                        },
                        drift: {
                            min: -0.5,
                            max: 0.5,
                        },
                    },
                    wobble: {
                        enable: true,
                        distance: 10,
                        speed: 5,
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
