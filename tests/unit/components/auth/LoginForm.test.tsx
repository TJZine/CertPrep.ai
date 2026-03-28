import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Set env var BEFORE anything else
process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = "test-key";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: (): { push: typeof mockPush; refresh: typeof mockRefresh } => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock supabase client
const mockSignInWithPassword = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: (): { auth: { signInWithPassword: typeof mockSignInWithPassword } } => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

// Mock useAuthRedirect
vi.mock("@/hooks/useAuthRedirect", () => ({
  useAuthRedirect: vi.fn(),
}));

// Mock useToast
const mockAddToast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: typeof mockAddToast } => ({
    addToast: mockAddToast,
  }),
}));

// Mock hcaptcha (use require within the factory to avoid hoisting issues)
vi.mock("@hcaptcha/react-hcaptcha", () => {
  const React = require("react");
  const Mock = React.forwardRef(function HCaptchaMock(props: { onVerify: (token: string) => void }, ref: React.Ref<unknown>) {
    React.useImperativeHandle(ref, () => ({
      resetCaptcha: vi.fn(),
    }));
    return <div data-testid="mock-hcaptcha" onClick={() => props.onVerify("mock-token")} />;
  });
  return { default: Mock };
});

import LoginForm from "@/components/auth/LoginForm";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("updates state on input change", () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("password123");
  });

  it("shows error if captcha is enabled but not completed", async () => {
    render(<LoginForm />);
    
    // Check if captcha is present
    if (screen.queryByTestId("mock-hcaptcha")) {
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "password123" } });
      
      fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

      expect(screen.getByText(/Please complete the captcha/i)).toBeInTheDocument();
    }
  });

  it("successfully signs in and navigates", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    
    render(<LoginForm />);
    
    // Complete captcha if present
    const captcha = screen.queryByTestId("mock-hcaptcha");
    if (captcha) {
      fireEvent.click(captcha);
    }

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "password123" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: { captchaToken: captcha ? "mock-token" : undefined },
      });
      expect(mockPush).toHaveBeenCalledWith("/");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("handles sign in error", async () => {
    mockSignInWithPassword.mockResolvedValue({ 
      error: { message: "Invalid credentials", status: 400 } 
    });
    
    render(<LoginForm />);
    
    // Complete captcha if present
    const captcha = screen.queryByTestId("mock-hcaptcha");
    if (captcha) {
      fireEvent.click(captcha);
    }

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "wrong-password" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
      expect(mockAddToast).toHaveBeenCalledWith("error", expect.any(String));
    });
  });
});