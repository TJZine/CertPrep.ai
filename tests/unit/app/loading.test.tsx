import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Loading from "@/app/loading";

// Mock the LoadingSpinner component
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: ({ size, text }: { size: string, text: string }): React.ReactElement => (
    <div data-testid="loading-spinner" data-size={size}>{text}</div>
  )
}));

describe("Global Loading UI", () => {
  it("renders the loading spinner correctly", () => {
    render(<Loading />);
    const spinner = screen.getByTestId("loading-spinner");
    expect(spinner).toBeDefined();
    expect(spinner.getAttribute("data-size")).toBe("lg");
    expect(spinner.textContent).toBe("Loading...");
  });
});