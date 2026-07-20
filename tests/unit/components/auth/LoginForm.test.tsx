import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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
  createClient: (): {
    auth: { signInWithPassword: typeof mockSignInWithPassword };
  } => ({
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
  const Mock = React.forwardRef(function HCaptchaMock(
    props: { onVerify: (token: string) => void },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({
      resetCaptcha: vi.fn(),
    }));
    return (
      <div
        data-testid="mock-hcaptcha"
        onClick={() => props.onVerify("mock-token")}
      />
    );
  });
  return { default: Mock };
});

let LoginForm: typeof import("@/components/auth/LoginForm").default;

describe("LoginForm", () => {
  beforeAll(async () => {
    // LoginForm captures this public key when its module is evaluated.
    vi.stubEnv("NEXT_PUBLIC_HCAPTCHA_SITE_KEY", "test-key");
    ({ default: LoginForm } = await import("@/components/auth/LoginForm"));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form with the configured captcha", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByTestId("mock-hcaptcha")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign In/i }),
    ).toBeInTheDocument();
  });

  it("links to password recovery", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("link", { name: /forgot password/i }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("updates state on input change", () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /Password/i,
    ) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("password123");
  });

  it("shows an error when the configured captcha is not completed", () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(
      screen.getByText(/Please complete the captcha/i),
    ).toBeInTheDocument();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("successfully signs in and navigates", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    render(<LoginForm />);

    fireEvent.click(screen.getByTestId("mock-hcaptcha"));

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: { captchaToken: "mock-token" },
      });
      expect(mockPush).toHaveBeenCalledWith("/");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("handles sign in error", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid credentials", status: 400 },
    });

    render(<LoginForm />);

    fireEvent.click(screen.getByTestId("mock-hcaptcha"));

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "wrong-password" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid email or password/i),
      ).toBeInTheDocument();
      expect(mockAddToast).toHaveBeenCalledWith("error", expect.any(String));
    });
  });
});
