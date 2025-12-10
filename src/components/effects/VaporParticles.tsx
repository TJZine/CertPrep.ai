'use client';

import { useEffect, useState, useCallback } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

/**
 * VaporParticles - Falling grid dots / digital rain effect for Vapor theme
 * 
 * Creates an 80s synthwave atmosphere with:
 * - Pink and cyan neon particles falling like digital rain
 * - Sharp movement for that retro-futuristic feel
 * - Grid-like alignment with subtle randomness
 */
export default function VaporParticles(): React.ReactElement | null {
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const particlesLoaded = useCallback(async (): Promise<void> => {
        // Digital rain loaded
    }, []);

    if (!init) {
        return null;
    }

    return (
        <Particles
            id="vapor-particles"
            particlesLoaded={particlesLoaded}
            options={{
                fullScreen: {
                    enable: true,
                    zIndex: 1, // Behind content
                },
                fpsLimit: 60, // Smooth for that neon vibe
                particles: {
                    number: {
                        value: 50,
                        density: {
                            enable: true,
                            width: 1920,
                            height: 1080,
                        },
                    },
                    color: {
                        value: ['#ff0080', '#00d4ff', '#ff0080', '#00d4ff', '#ff00ff'],
                    },
                    shape: {
                        type: 'circle',
                    },
                    opacity: {
                        value: { min: 0.3, max: 0.8 },
                        animation: {
                            enable: true,
                            speed: 1,
                            sync: false,
                        },
                    },
                    size: {
                        value: { min: 1, max: 3 },
                    },
                    move: {
                        enable: true,
                        speed: { min: 1, max: 3 },
                        direction: 'bottom',
                        straight: true,
                        outModes: {
                            default: 'out',
                            top: 'out',
                            bottom: 'out',
                        },
                    },
                    // Glow effect via shadow
                    shadow: {
                        enable: true,
                        color: '#ff0080',
                        blur: 10,
                    },
                    // Trail effect for that rain feel
                    trail: {
                        enable: true,
                        length: 8,
                        fill: {
                            color: '#1a0d24', // Match vapor background
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
