'use client';

import confetti from 'canvas-confetti';

export function celebratePerfectScore(): void {
  if (typeof window === 'undefined') return;

  const duration = 3000;
  const end = Date.now() + duration;
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'];

  const launchFrame = (): void => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });

    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(launchFrame);
    }
  };

  launchFrame();
}
