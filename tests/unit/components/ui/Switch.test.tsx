import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "@/components/ui/Switch";

describe("Switch", () => {
  it("renders with role=switch and toggles via click", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch checked={false} onCheckedChange={onCheckedChange} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Switch checked={false} onCheckedChange={onCheckedChange} disabled />,
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toBeDisabled();

    await user.click(toggle);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

