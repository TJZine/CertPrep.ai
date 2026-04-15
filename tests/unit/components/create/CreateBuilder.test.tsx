import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CreateBuilder } from "@/components/create/CreateBuilder";

describe("CreateBuilder", () => {
    it("provides an actionable import path when Import JSON mode is selected", () => {
        render(<CreateBuilder />);

        fireEvent.click(screen.getByRole("button", { name: /import json/i }));
        expect(screen.getByRole("link", { name: /open dashboard import/i })).toHaveAttribute("href", "/?import=1");
    });

    it("includes custom categories in the generated prompt", () => {
        render(<CreateBuilder />);

        fireEvent.click(screen.getByRole("radio", { name: /custom categories/i }));
        fireEvent.change(screen.getByLabelText(/enter your exam categories/i), {
            target: { value: "Domain A\nDomain B" },
        });

        expect(screen.getByText(/- Domain A/)).toBeInTheDocument();
        expect(screen.getByText(/- Domain B/)).toBeInTheDocument();
    });

    it("lets match style update the generated question count without relying on hidden stale state", () => {
        render(<CreateBuilder />);

        fireEvent.click(screen.getByRole("radio", { name: /match style/i }));

        const questionCountInput = screen.getByRole("spinbutton", { name: /^questions$/i });
        fireEvent.change(questionCountInput, { target: { value: "25" } });

        expect(screen.getByText(/Create 25 NEW questions/i)).toBeInTheDocument();
    });
});
