import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "@/components/layout/Header";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  user: null as { email: string } | null,
  signOut: vi.fn(),
  lockBodyScroll: vi.fn(),
  unlockBodyScroll: vi.fn(),
  desktopMediaListeners: new Set<(event: MediaQueryListEvent) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: (): string => mocks.pathname,
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: (): {
    user: typeof mocks.user;
    signOut: typeof mocks.signOut;
  } => ({
    user: mocks.user,
    signOut: mocks.signOut,
  }),
}));

vi.mock("@/components/common/ThemePalette", () => ({
  ThemePalette: (): React.ReactElement => <button type="button">Theme</button>,
}));

vi.mock("@/components/common/SyncStatusIndicator", () => ({
  SyncStatusIndicator: (): React.ReactElement => <span>Synced</span>,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: ReturnType<typeof vi.fn> } => ({
    addToast: vi.fn(),
  }),
}));

vi.mock("@/lib/bodyScrollLock", () => ({
  lockBodyScroll: mocks.lockBodyScroll,
  unlockBodyScroll: mocks.unlockBodyScroll,
}));

describe("Header responsive navigation", () => {
  beforeEach(() => {
    mocks.pathname = "/";
    mocks.user = null;
    mocks.signOut.mockReset();
    mocks.lockBodyScroll.mockReset();
    mocks.unlockBodyScroll.mockReset();
    mocks.desktopMediaListeners.clear();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(
        (): Partial<MediaQueryList> => ({
          matches: false,
          media: "(min-width: 1280px)",
          addEventListener: (
            _type: string,
            listener: EventListenerOrEventListenerObject,
          ): void => {
            mocks.desktopMediaListeners.add(
              listener as (event: MediaQueryListEvent) => void,
            );
          },
          removeEventListener: (
            _type: string,
            listener: EventListenerOrEventListenerObject,
          ): void => {
            mocks.desktopMediaListeners.delete(
              listener as (event: MediaQueryListEvent) => void,
            );
          },
        }),
      ),
    );
  });

  it("keeps the closed mobile sheet within the viewport and opens it in place", () => {
    render(<Header />);

    const menu = document.getElementById("mobile-nav");
    const trigger = screen.getByRole("button", { name: "Open menu" });

    expect(menu).not.toHaveClass("translate-x-full");
    expect(menu).toHaveClass("pointer-events-none", "-translate-y-2");

    fireEvent.click(trigger);

    expect(menu).not.toHaveClass("pointer-events-none");
    expect(menu).toHaveClass("translate-y-0");
    expect(within(menu!).getByRole("link", { name: "Dashboard" })).toHaveFocus();
    expect(mocks.lockBodyScroll).toHaveBeenCalledOnce();
  });

  it("closes on Escape and restores focus to the menu trigger", () => {
    render(<Header />);

    const trigger = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(trigger);
    const menu = document.getElementById("mobile-nav");
    expect(menu).not.toBeNull();
    within(menu!).getByRole("link", { name: "Analytics" }).focus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.getElementById("mobile-nav")).toHaveClass(
      "pointer-events-none",
      "-translate-y-2",
    );
    expect(trigger).toHaveFocus();
  });

  it("wraps Tab and Shift+Tab within the open navigation dialog", () => {
    render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = screen.getByRole("dialog", { name: "Navigation menu" });
    const firstItem = within(menu).getByRole("link", { name: "Dashboard" });
    const lastItem = within(menu).getByRole("link", { name: "Sign Up" });

    expect(firstItem).toHaveFocus();

    lastItem.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(firstItem).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(lastItem).toHaveFocus();

    screen.getByRole("img", { name: "CertPrep.ai Logo" }).closest("a")?.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(firstItem).toHaveFocus();
  });

  it("keeps authenticated navigation in the mobile shell below the xl breakpoint", () => {
    mocks.user = { email: "tablet-audit@example.com" };

    render(<Header />);

    expect(screen.getByRole("navigation", { name: "Main navigation" })).toHaveClass(
      "hidden",
      "xl:flex",
    );
    expect(screen.getByRole("button", { name: "Open menu" }).parentElement).toHaveClass(
      "xl:hidden",
    );
    expect(screen.getAllByText("tablet-audit@example.com")).toHaveLength(2);
  });

  it("closes an open compact menu and unlocks scrolling when entering xl", () => {
    render(<Header />);

    const trigger = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(trigger);
    const menu = document.getElementById("mobile-nav");
    expect(menu).not.toBeNull();
    within(menu!).getByRole("link", { name: "Analytics" }).focus();

    act(() => {
      for (const listener of mocks.desktopMediaListeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(menu).toHaveAttribute("aria-hidden", "true");
    expect(mocks.unlockBodyScroll).toHaveBeenCalledOnce();
    expect(screen.getByRole("img", { name: "CertPrep.ai Logo" }).closest("a")).toHaveFocus();
  });
});
