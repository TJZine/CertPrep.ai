import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Textarea } from "@/components/ui/Textarea";

describe("Textarea", () => {
  it("associates label with textarea", () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("associates helper text via aria-describedby", () => {
    render(<Textarea helperText="Help text" />);
    const helper = screen.getByText("Help text");
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("aria-describedby", helper.getAttribute("id"));
  });

  it("sets aria-invalid and associates error text via aria-describedby", () => {
    render(<Textarea error="Required" />);
    const error = screen.getByText("Required");
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea.getAttribute("aria-describedby")).toContain(error.getAttribute("id"));
  });
});

