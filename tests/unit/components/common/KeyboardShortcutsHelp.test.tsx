import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KeyboardShortcutsHelp } from "@/components/common/KeyboardShortcutsHelp";

// Mock the Modal component
vi.mock("@/components/ui/Modal", () => ({
  Modal: ({
    children,
    isOpen,
    title,
    onClose,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    title: string;
    onClose: () => void;
  }): React.ReactElement | null => {
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-label={title} data-testid="modal">
        <h2>{title}</h2>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    );
  },
}));

describe("KeyboardShortcutsHelp", () => {
  it("renders nothing when closed", () => {
    render(<KeyboardShortcutsHelp isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders modal when open", () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("modal")).toBeDefined();
    expect(screen.getByText("Keyboard Shortcuts")).toBeDefined();
  });

  it("calls onClose when the close button is clicked", () => {
    const mockOnClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText("Close"));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
