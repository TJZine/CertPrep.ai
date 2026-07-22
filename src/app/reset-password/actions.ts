"use server";

import { cookies } from "next/headers";
import {
  RECOVERY_PROOF_COOKIE_NAME,
  RECOVERY_PROOF_COOKIE_PATH,
} from "@/lib/auth/recoveryProof";

export async function consumeRecoveryProof(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(RECOVERY_PROOF_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: RECOVERY_PROOF_COOKIE_PATH,
    maxAge: 0,
  });
}
