import React from 'react';
import { cn } from '@/lib/utils';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
}

/**
 * Hides content visually while keeping it accessible to screen readers.
 * Uses Tailwind's sr-only class for CSP compliance (no inline styles).
 */
export function VisuallyHidden({ children, as: Component = 'span', className }: VisuallyHiddenProps): React.ReactElement {
  const ComponentTag = Component as React.ElementType;
  return <ComponentTag className={cn('sr-only', className)}>{children}</ComponentTag>;
}

export default VisuallyHidden;
