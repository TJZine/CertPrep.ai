import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HolidayParticles from "@/components/effects/HolidayParticles";
import MidnightParticles from "@/components/effects/MidnightParticles";
import VaporParticles from "@/components/effects/VaporParticles";

vi.mock("@tsparticles/react", () => ({
  default: ({ id }: { id?: string }): React.JSX.Element => (
    <div data-testid={id} />
  ),
  ParticlesProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <>{children}</>,
}));

describe.each([
  ["holiday", HolidayParticles],
  ["midnight", MidnightParticles],
  ["vapor", VaporParticles],
] as const)("%s particle effect", (theme, ParticleEffect) => {
  it("hides its decorative particle tree from assistive technologies", () => {
    render(<ParticleEffect />);

    const particles = screen.getByTestId(`${theme}-particles`);
    expect(particles.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
