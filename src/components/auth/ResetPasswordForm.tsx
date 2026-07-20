"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAuthErrorMessage } from "@/lib/auth/authUtils";
import { useToast } from "@/components/ui/Toast";
import { resetPasswordSchema } from "@/validators/authSchema";
import { ZodError } from "zod";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { consumeRecoveryProof } from "@/app/reset-password/actions";

type ResetPasswordFormProps = {
  expectedRecoveryUserId: string | null;
};

type RecoveryValidation = {
  expectedUserId: string | null;
  status: "validating" | "ready" | "invalid";
  error: string | null;
};

const INVALID_RECOVERY_LINK_MESSAGE =
  "This recovery link is invalid or has expired. Please request a new password reset email.";

function createInitialValidation(
  expectedRecoveryUserId: string | null,
): RecoveryValidation {
  return {
    expectedUserId: expectedRecoveryUserId,
    status: expectedRecoveryUserId ? "validating" : "invalid",
    error: expectedRecoveryUserId
      ? null
      : INVALID_RECOVERY_LINK_MESSAGE,
  };
}

export default function ResetPasswordForm({
  expectedRecoveryUserId,
}: ResetPasswordFormProps): React.ReactElement {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { addToast } = useToast();

  const [validation, setValidation] = useState<RecoveryValidation>(() =>
    createInitialValidation(expectedRecoveryUserId),
  );
  const currentValidation =
    validation.expectedUserId === expectedRecoveryUserId
      ? validation
      : createInitialValidation(expectedRecoveryUserId);

  useEffect(() => {
    if (!expectedRecoveryUserId) {
      return;
    }

    let cancelled = false;
    const confirmSession = async (): Promise<void> => {
      try {
        if (!supabase) {
          throw new Error("Authentication service unavailable.");
        }

        const { data, error } = await supabase.auth.getSession();
        if (cancelled) {
          return;
        }

        if (
          !error &&
          data.session?.user.id === expectedRecoveryUserId
        ) {
          setValidation({
            expectedUserId: expectedRecoveryUserId,
            status: "ready",
            error: null,
          });
        } else {
          setValidation({
            expectedUserId: expectedRecoveryUserId,
            status: "invalid",
            error: INVALID_RECOVERY_LINK_MESSAGE,
          });
        }
      } catch {
        if (!cancelled) {
          setValidation({
            expectedUserId: expectedRecoveryUserId,
            status: "invalid",
            error: INVALID_RECOVERY_LINK_MESSAGE,
          });
        }
      }
    };

    void confirmSession();

    return (): void => {
      cancelled = true;
    };
  }, [expectedRecoveryUserId, supabase]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (currentValidation.status === "validating") {
      setError("Validating your recovery link. Please wait.");
      setIsLoading(false);
      return;
    }

    if (currentValidation.status === "invalid") {
      setIsLoading(false);
      setError(
        currentValidation.error ?? INVALID_RECOVERY_LINK_MESSAGE,
      );
      return;
    }

    if (currentValidation.status !== "ready") {
      setError(INVALID_RECOVERY_LINK_MESSAGE);
      setIsLoading(false);
      return;
    }

    // Validate input
    try {
      resetPasswordSchema.parse({ password, confirmPassword });
    } catch (err) {
      if (err instanceof ZodError) {
        setError((err as ZodError).issues[0]?.message ?? "Invalid input");
      } else {
        setError("Invalid input");
      }
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      setError("Authentication service unavailable.");
      setIsLoading(false);
      return;
    }

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (
        sessionError ||
        sessionData.session?.user.id !== expectedRecoveryUserId
      ) {
        setError(INVALID_RECOVERY_LINK_MESSAGE);
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(getAuthErrorMessage(error));
        return;
      }

      try {
        await consumeRecoveryProof();
      } catch {
        // The proof is already short-lived; cleanup failure must not obscure a
        // password update that Supabase has confirmed.
      }

      addToast("success", "Password updated successfully!");
      router.push("/"); // Redirect to dashboard
      router.refresh();
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (currentValidation.status === "validating") {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p
          role="status"
          className="text-sm text-muted-foreground font-medium"
        >
          Validating your recovery link...
        </p>
      </div>
    );
  }

  if (currentValidation.status === "invalid") {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Reset Link Unavailable</h1>
          <p role="alert" className="text-sm text-destructive font-medium">
            {currentValidation.error ?? INVALID_RECOVERY_LINK_MESSAGE}
          </p>
        </div>
        <div className="space-y-3">
          <Link
            href="/forgot-password"
            className={cn(buttonVariants(), "w-full")}
          >
            Request a New Reset Link
          </Link>
          <Link
            href="/login"
            className="inline-block text-sm underline underline-offset-4 hover:text-primary"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="text-muted-foreground">
          Enter your new password below
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            New Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
            minLength={8}
          />
        </div>

        {error && (
          <div className="text-sm text-destructive font-medium">{error}</div>
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  );
}
