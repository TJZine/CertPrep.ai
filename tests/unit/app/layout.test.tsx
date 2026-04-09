/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RootLayout from "@/app/layout";

// Mock metadata and fonts to simplify testing
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter" }),
  Press_Start_2P: () => ({ variable: "font-press-start" }),
  Nunito: () => ({ variable: "font-nunito" }),
  Roboto_Slab: () => ({ variable: "font-roboto-slab" }),
  Space_Grotesk: () => ({ variable: "font-space-grotesk" }),
  Playfair_Display: () => ({ variable: "font-playfair" }),
  JetBrains_Mono: () => ({ variable: "font-jetbrains" }),
  Courier_Prime: () => ({ variable: "font-courier" }),
  Cormorant_Garamond: () => ({ variable: "font-cormorant" }),
}));

vi.mock("@/components/layout/Header", () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock("@/components/layout/Footer", () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock("@/components/layout/PageTransition", () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/providers/AppProviders", () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-providers">{children}</div>
  ),
}));

vi.mock("@/components/common/SkipLink", () => ({
  SkipLink: () => <div data-testid="skip-link" />,
}));

vi.mock("@/components/common/ServiceWorkerInitScript", () => ({
  ServiceWorkerInitScript: () => <div data-testid="sw-init" />,
}));

vi.mock("@/components/common/ThemeInitScript", () => ({
  ThemeInitScript: () => <div data-testid="theme-init" />,
}));

vi.mock("@/components/effects/ThemeEffects", () => ({
  ThemeEffects: () => <div data-testid="theme-effects" />,
}));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: vi.fn() }),
}));

describe("RootLayout", () => {
  it("renders children and providers", async () => {
    // RootLayout is an async component
    const Layout = await RootLayout({
      children: <div data-testid="child">Child Content</div>,
    });

    render(Layout);

    expect(screen.getByTestId("header")).toBeDefined();
    expect(screen.getByTestId("footer")).toBeDefined();
    expect(screen.getByTestId("app-providers")).toBeDefined();
    expect(screen.getByTestId("child")).toBeDefined();
  });
});
