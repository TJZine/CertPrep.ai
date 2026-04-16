import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders a badge label", () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText("New");
    expect(badge.tagName.toLowerCase()).toBe("span");
  });

  it("renders the destructive variant", () => {
    render(<Badge variant="destructive">Alert</Badge>);
    const badge = screen.getByText("Alert");
    expect(badge.className).toContain("bg-destructive");
  });
});
