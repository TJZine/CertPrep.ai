import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EmptyCardState } from "@/components/analytics/EmptyCardState";

describe("EmptyCardState", () => {
  const defaultProps = {
    icon: <svg data-testid="main-icon" />,
    title: "No Data",
    description: "There is nothing to see here yet.",
  };

  it("renders with basic required props", () => {
    render(<EmptyCardState {...defaultProps} />);

    // Title and Description
    expect(screen.getByText("No Data")).toBeInTheDocument();
    expect(screen.getByText("There is nothing to see here yet.")).toBeInTheDocument();

    // Check if the icon is rendered (it's cloned inside, but testid should remain)
    // There are actually 2 icons rendered: one in the header (if headerIcon is missing), one in the body.
    const icons = screen.getAllByTestId("main-icon");
    expect(icons.length).toBe(2);
  });

  it("renders with a custom headerIcon", () => {
    render(
      <EmptyCardState
        {...defaultProps}
        headerIcon={<svg data-testid="header-icon" />}
      />
    );

    // Header icon should be present (1)
    expect(screen.getByTestId("header-icon")).toBeInTheDocument();
    
    // Main icon should be present in the body only (1)
    expect(screen.getAllByTestId("main-icon").length).toBe(1);
  });

  it("renders an optional action button/element", () => {
    render(
      <EmptyCardState
        {...defaultProps}
        action={<button>Take Action</button>}
      />
    );

    expect(screen.getByRole("button", { name: "Take Action" })).toBeInTheDocument();
  });

  it("applies a custom className to the Card", () => {
    const { container } = render(
      <EmptyCardState {...defaultProps} className="custom-empty-state-class" />
    );
    expect(container.firstChild).toHaveClass("custom-empty-state-class");
  });
});