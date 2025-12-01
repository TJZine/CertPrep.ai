'use client';

import { useEffect, useState } from 'react';

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
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    if (authUserId) {
      setGuestId(null);
      return;
    }
    const id = ensureGuestUserId();
    setGuestId(id);
  }, [authUserId]);

  return authUserId ?? guestId;
}
