import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "@/components/ui/Select";

describe("Select", () => {
  it("renders a native select and calls onChange with selected value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Select
        placeholder="Pick one"
        onChange={onChange}
        options={[
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
        ]}
      />,
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    await user.selectOptions(select, "b");
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

