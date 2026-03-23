import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "@/components/ui/Skeleton";

describe("Skeleton", () => {
  it("renders a skeleton placeholder with marker attribute", () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId("skeleton")).toHaveAttribute("data-skeleton");
  });
});

