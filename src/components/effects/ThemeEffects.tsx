'use client';

import dynamic from 'next/dynamic';
import { useTheme } from '@/components/common/ThemeProvider';

// Dynamically import premium particle effects - only loaded when needed
const BlossomParticles = dynamic(
    () => import('@/components/effects/BlossomParticles'),
    { ssr: false, loading: () => null }
);

const HolidayParticles = dynamic(
    () => import('@/components/effects/HolidayParticles'),
    { ssr: false, loading: () => null }
);

const MidnightParticles = dynamic(
    () => import('@/components/effects/MidnightParticles'),
    { ssr: false, loading: () => null }
);

const VaporParticles = dynamic(
    () => import('@/components/effects/VaporParticles'),
    { ssr: false, loading: () => null }
);

/**
 * ThemeEffects - Conditionally loads premium visual effects based on active theme
 * 
 * Uses dynamic imports to ensure zero bundle impact on themes that don't use
 * special effects. Each premium theme's effects are only downloaded when
 * that theme is activated.
 * 
 * Premium themes with effects:
 * - Blossom: Sakura petal particles
 * - Holiday: Snowfall particles
 * - Midnight: Twinkling stars
 * - Vapor: Digital rain (neon pink/cyan)
 */
export function ThemeEffects(): React.ReactElement | null {
    const { resolvedTheme } = useTheme();

    switch (resolvedTheme) {
        case 'blossom':
            return <BlossomParticles />;
        case 'holiday':
            return <HolidayParticles />;
        case 'midnight':
            return <MidnightParticles />;
        case 'vapor':
            return <VaporParticles />;
        default:
            return null;
    }
}
