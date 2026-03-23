import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Input } from "@/components/ui/Input";

describe("Input component", () => {
    it("renders an input element", () => {
        render(<Input placeholder="Test input" />);
        const input = screen.getByPlaceholderText("Test input");
        expect(input).toBeInTheDocument();
    });

    it("renders with a label", () => {
        render(<Input label="Username" id="username" />);
        const label = screen.getByText("Username");
        expect(label).toBeInTheDocument();

        // Check association
        const input = screen.getByLabelText("Username");
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("id", "username");
    });

    it("generates an id for the label if none is provided", () => {
        render(<Input label="Password" />);
        const input = screen.getByLabelText("Password");
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("id"); // Should have an auto-generated id
    });

    it("renders helper text and associates it via aria-describedby", () => {
        render(<Input helperText="Enter your credentials" />);

        const helperText = screen.getByText("Enter your credentials");
        expect(helperText).toBeInTheDocument();

        const input = screen.getByRole("textbox");
        const helperId = helperText.getAttribute("id");
        expect(input).toHaveAttribute("aria-describedby", helperId);
    });

    it("renders error text, applies error styles, and sets aria-invalid", () => {
        render(<Input error="Invalid input" />);

        const errorText = screen.getByText("Invalid input");
        expect(errorText).toBeInTheDocument();
        expect(errorText).toHaveClass("text-destructive");

        const input = screen.getByRole("textbox");
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveClass("border-destructive");

        const errorId = errorText.getAttribute("id");
        expect(input).toHaveAttribute("aria-describedby", errorId);
    });

    it("renders both helper and error text with correct aria-describedby", () => {
        render(<Input error="Too short" helperText="Must be 8 chars" />);

        const helperText = screen.getByText("Must be 8 chars");
        const errorText = screen.getByText("Too short");

        const helperId = helperText.getAttribute("id");
        const errorId = errorText.getAttribute("id");

        const input = screen.getByRole("textbox");

        // Should contain both IDs separated by space
        const ariaDescribedBy = input.getAttribute("aria-describedby");
        expect(ariaDescribedBy).toContain(helperId);
        expect(ariaDescribedBy).toContain(errorId);
    });

    it("supports passing a ref", () => {
        const ref = React.createRef<HTMLInputElement>();
        render(<Input ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("passes additional props down to the input element", () => {
        render(<Input data-testid="custom-input" disabled type="email" />);
        const input = screen.getByTestId("custom-input");

        expect(input).toBeDisabled();
        expect(input).toHaveAttribute("type", "email");
    });
});
