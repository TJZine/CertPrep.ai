"use client";

import { useState } from "react";

const GUEST_USER_KEY = "cp_guest_user_id";
let guestIdCounter = 0;

function ensureGuestUserId(): string | null {
  if (typeof window === "undefined") return null;
  let existing = localStorage.getItem(GUEST_USER_KEY);
  if (!existing) {
    const webCrypto = crypto as Crypto | undefined;
    const randomUUID = webCrypto?.randomUUID?.();
    if (randomUUID) {
      existing = randomUUID;
    } else if (webCrypto?.getRandomValues) {
      const buffer = new Uint32Array(1);
      webCrypto.getRandomValues(buffer);
      const randomValue = buffer[0] ?? 0;
      existing = `guest-${Date.now().toString(36)}-${randomValue.toString(16)}`;
    } else {
      guestIdCounter += 1;
      existing = `guest-${Date.now().toString(36)}-${guestIdCounter}`;
    }
    localStorage.setItem(GUEST_USER_KEY, existing);
  }
  return existing;
}

/**
 * Returns a stable identifier for data partitioning.
 * - If an authenticated user id is provided, it is returned.
 * - Otherwise, a persisted guest id is generated/stored locally.
 */
export function useEffectiveUserId(authUserId?: string | null): string | null {
  const [guestId] = useState<string | null>(() => ensureGuestUserId());
  return authUserId ?? guestId;
}
