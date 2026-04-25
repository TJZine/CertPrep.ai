import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import NotFound from "@/app/not-found";

vi.mock("next/navigation", () => ({
  useRouter: (): { back: () => void } => ({ back: vi.fn() }),
}));

describe("NotFound", () => {
    it("renders the page not found message", () => {
      render(<NotFound />);
      expect(screen.getByText(/Page Not Found/i)).toBeDefined();
    });

    it("renders the description", () => {
      render(<NotFound />);
      expect(screen.getByText(/doesn't exist or has been moved/i)).toBeDefined();
    });

    it("provides a button to go back", () => {
      render(<NotFound />);
      expect(screen.getByText(/Go Back/i)).toBeDefined();
    });

    it("provides a link to the dashboard", () => {
      render(<NotFound />);
      expect(screen.getByText(/Go to Dashboard/i)).toBeDefined();
    });
});
