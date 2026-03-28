import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DateRangeFilter, DATE_RANGE_VALUES } from "@/components/analytics/DateRangeFilter";

describe("DateRangeFilter", () => {
  it("renders all date range options", () => {
    const onChange = vi.fn();
    render(<DateRangeFilter value="7d" onChange={onChange} />);

    expect(screen.getByRole("group", { name: /date range filter/i })).toBeInTheDocument();
    
    expect(screen.getByRole("button", { name: "7 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All Time" })).toBeInTheDocument();
  });

  it("highlights the currently selected value", () => {
    const onChange = vi.fn();
    render(<DateRangeFilter value="30d" onChange={onChange} />);

    const btn30d = screen.getByRole("button", { name: "30 Days" });
    const btn7d = screen.getByRole("button", { name: "7 Days" });

    expect(btn30d).toHaveAttribute("aria-pressed", "true");
    expect(btn7d).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange when an option is clicked", () => {
    const onChange = vi.fn();
    render(<DateRangeFilter value="7d" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "All Time" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("exports DATE_RANGE_VALUES correctly", () => {
    expect(DATE_RANGE_VALUES).toEqual(["7d", "30d", "90d", "all"]);
  });

  it("applies custom className", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DateRangeFilter value="7d" onChange={onChange} className="custom-filter-class" />
    );
    expect(container.firstChild).toHaveClass("custom-filter-class");
  });
});