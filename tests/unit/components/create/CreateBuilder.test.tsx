import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CreateBuilder } from "@/components/create/CreateBuilder";

describe("CreateBuilder", () => {
    it("provides an actionable import path when Import JSON mode is selected", () => {
        render(<CreateBuilder />);

        fireEvent.click(screen.getByRole("button", { name: /import json/i }));
        expect(screen.getByRole("link", { name: /open dashboard import/i })).toBeInTheDocument();
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
});
