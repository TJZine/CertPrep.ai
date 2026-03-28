import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement => {
  if (shouldThrow) {
    throw new Error("Test error!");
  }
  return <div data-testid="child">Safe Child</div>;
};

describe("ErrorBoundary", () => {
  // Suppress console.error in tests since ErrorBoundary logs the error
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("child")).toBeDefined();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });

  it("renders default fallback UI when an error is thrown", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Test error!")).toBeDefined();
    expect(screen.getByText("Try Again")).toBeDefined();
    expect(screen.queryByTestId("child")).toBeNull();
  });

  it("renders custom fallback UI if provided", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error View</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("custom-fallback")).toBeDefined();
    expect(screen.getByText("Custom Error View")).toBeDefined();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });
});

