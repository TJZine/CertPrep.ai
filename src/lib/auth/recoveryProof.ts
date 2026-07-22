export const RECOVERY_PROOF_COOKIE_NAME = "certprep-recovery-proof";
export const RECOVERY_PROOF_COOKIE_PATH = "/reset-password";
export const RECOVERY_PROOF_MAX_AGE_SECONDS = 5 * 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RecoveryProof = {
  nonce: string;
  userId: string;
};

export function generateRecoveryProofNonce(): string {
  return crypto.randomUUID();
}

export function serializeRecoveryProof(proof: RecoveryProof): string {
  return `${proof.nonce}.${proof.userId}`;
}

export function parseRecoveryProof(
  value: string | undefined,
): RecoveryProof | null {
  if (!value) {
    return null;
  }

  const parts = value.split(".");
  if (
    parts.length !== 2 ||
    !UUID_PATTERN.test(parts[0] ?? "") ||
    !UUID_PATTERN.test(parts[1] ?? "")
  ) {
    return null;
  }

  return {
    nonce: parts[0] as string,
    userId: parts[1] as string,
  };
}
