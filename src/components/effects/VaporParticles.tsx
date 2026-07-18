"use client";

import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

/**
 * Falling grid dots / digital rain effect for Vapor theme.
 */
function VaporParticleEffect(): React.ReactElement {
  return (
    <Particles
      id="vapor-particles"
      options={{
        fullScreen: {
          enable: true,
          zIndex: 40,
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
            value: ["#ff0080", "#00d4ff", "#ff0080", "#00d4ff", "#ff00ff"],
          },
          shape: {
            type: "circle",
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
            direction: "bottom",
            straight: true,
            outModes: {
              default: "out",
              top: "out",
              bottom: "out",
            },
          },
          shadow: {
            enable: true,
            color: "#ff0080",
            blur: 10,
          },
          trail: {
            enable: true,
            length: 8,
            fill: {
              color: "#1a0d24",
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

export default function VaporParticles(): React.ReactElement {
  return (
    <ParticlesProvider init={loadSlim}>
      <VaporParticleEffect />
    </ParticlesProvider>
  );
}
