"use client";

import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

/**
 * Subtle snowfall effect for Holiday theme.
 */
function HolidayParticleEffect(): React.ReactElement {
  return (
    <Particles
      id="holiday-particles"
      options={{
        fullScreen: {
          enable: true,
          zIndex: 40,
        },
        fpsLimit: 60,
        particles: {
          number: {
            value: 120,
            density: {
              enable: true,
              width: 1920,
              height: 1080,
            },
          },
          color: {
            value: ["#ffffff", "#f0f8ff", "#e8f4fc", "#dbeafe"],
          },
          shape: {
            type: "circle",
          },
          opacity: {
            value: { min: 0.5, max: 0.9 },
          },
          size: {
            value: { min: 0.5, max: 2 }, // Small, subtle dots
          },
          move: {
            enable: true,
            direction: "bottom",
            speed: { min: 0.4, max: 1.0 }, // Slower, gentler fall
            straight: false,
            outModes: {
              default: "out",
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
        pauseOnBlur: true, // Pause animation when tab loses focus to save resources
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

export default function HolidayParticles(): React.ReactElement {
  return (
    <ParticlesProvider init={loadSlim}>
      <HolidayParticleEffect />
    </ParticlesProvider>
  );
}
