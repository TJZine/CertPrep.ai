import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LoginPage, { metadata } from "@/app/login/page";

// Mock the LoginForm component
vi.mock("@/components/auth/LoginForm", () => ({
  default: (): React.ReactElement => <div data-testid="login-form">Mock Login Form</div>
}));

describe("LoginPage", () => {
  it("renders the LoginForm component", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("login-form")).toBeDefined();
    expect(screen.getByText("Mock Login Form")).toBeDefined();
  });

  it("exports correct metadata", () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("Login");
    expect(metadata.description).toBe("Login to your account");
  });
});
