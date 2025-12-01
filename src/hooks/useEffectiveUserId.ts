'use client';

import { useState } from 'react';

const GUEST_USER_KEY = 'cp_guest_user_id';

function ensureGuestUserId(): string | null {
  if (typeof window === 'undefined') return null;
  let existing = localStorage.getItem(GUEST_USER_KEY);
  if (!existing) {
    existing = crypto.randomUUID();
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
