"use client";

import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

/**
 * Twinkling stars effect for Midnight theme.
 */
function MidnightParticleEffect(): React.ReactElement {
  return (
    <Particles
      id="midnight-particles"
      aria-hidden="true"
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
            value: ["#ffffff", "#ffeaa7", "#dfe6e9", "#a29bfe"],
          },
          shape: {
            type: "circle",
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
            direction: "none",
            random: true,
            straight: false,
            outModes: {
              default: "bounce",
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
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

export default function MidnightParticles(): React.ReactElement {
  return (
    <ParticlesProvider init={loadSlim}>
      <MidnightParticleEffect />
    </ParticlesProvider>
  );
}
