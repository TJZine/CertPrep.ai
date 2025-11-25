'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Skip link for keyboard users to bypass navigation.
 * Only visible when focused.
 */
export function SkipLink(): React.ReactElement {
  return (
    <a
      href="#main-content"
      className={cn(
        'fixed left-4 top-4 z-[100] -translate-y-full rounded-lg bg-blue-600 px-4 py-2 text-white',
        'transition-transform focus:translate-y-0',
        'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
      )}
    >
      Skip to main content
    </a>
  );
}

export default SkipLink;
