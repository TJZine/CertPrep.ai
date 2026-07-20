import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import {
  parseRecoveryProof,
  RECOVERY_PROOF_COOKIE_NAME,
} from "@/lib/auth/recoveryProof";
import { cookies } from "next/headers";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your account",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{
    recovery?: string | string[];
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const recoveryNonce =
    typeof params.recovery === "string" ? params.recovery : null;
  const proofCookie = (await cookies()).get(
    RECOVERY_PROOF_COOKIE_NAME,
  )?.value;
  const recoveryProof = parseRecoveryProof(proofCookie);
  const expectedRecoveryUserId =
    recoveryNonce && recoveryProof?.nonce === recoveryNonce
      ? recoveryProof.userId
      : null;

  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <ResetPasswordForm
          expectedRecoveryUserId={expectedRecoveryUserId}
        />
      </div>
    </div>
  );
}
