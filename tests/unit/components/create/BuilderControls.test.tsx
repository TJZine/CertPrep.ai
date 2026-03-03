import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BuilderControls } from "@/components/create/BuilderControls";
import { INITIAL_BUILDER_STATE } from "@/types/create";

describe("BuilderControls", () => {
    it("keeps at least one preset radio tabbable when no preset is selected", () => {
        render(<BuilderControls state={INITIAL_BUILDER_STATE} onChange={vi.fn()} />);

        const radios = screen.getAllByRole("radio");
        expect(radios.some((radio) => radio.getAttribute("tabIndex") === "0")).toBe(true);
    });

    it("supports selecting custom categories and editing the custom category input", () => {
        const onChange = vi.fn();
        const { rerender } = render(<BuilderControls state={INITIAL_BUILDER_STATE} onChange={onChange} />);

        fireEvent.click(screen.getByRole("radio", { name: /custom categories/i }));
        expect(onChange).toHaveBeenCalledWith({ presetId: "custom" });

        const customState = {
            ...INITIAL_BUILDER_STATE,
            presetId: "custom" as const,
        };

        rerender(<BuilderControls state={customState} onChange={onChange} />);

        const customTextarea = screen.getByLabelText(/enter your exam categories/i);
        fireEvent.change(customTextarea, { target: { value: "Domain 1\nDomain 2" } });
        expect(onChange).toHaveBeenCalledWith({ customCategories: "Domain 1\nDomain 2" });
    });
});
