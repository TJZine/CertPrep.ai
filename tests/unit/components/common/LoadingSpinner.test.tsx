import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders correctly with default props", () => {
    render(<LoadingSpinner />);
    const container = screen.getByRole("status");
    expect(container).toBeDefined();

    // Check if sr-only text is present
    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("renders with custom text", () => {
    render(<LoadingSpinner text="Custom loading text" />);
    expect(screen.getByText("Custom loading text")).toBeDefined();
  });

  it("applies custom className", () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    // The spinner container should have the custom class
    expect(container.firstChild).toBeDefined();
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain("custom-class");
  });

  it("applies size props correctly", () => {
    render(<LoadingSpinner size="lg" />);
    const svg = document.querySelector("svg");
    // Should have larger sizing classes based on sizeMap
    expect(svg?.className.baseVal).toContain("h-12");
    expect(svg?.className.baseVal).toContain("w-12");
  });
});
