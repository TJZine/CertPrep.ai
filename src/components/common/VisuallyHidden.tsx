import * as React from 'react';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: React.ElementType;
}

/**
 * Hides content visually while keeping it accessible to screen readers.
 * Uses Tailwind's sr-only class for CSP compliance (no inline styles).
 */
export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps): React.ReactElement {
  const ComponentTag = Component as React.ElementType;
  return <ComponentTag className="sr-only">{children}</ComponentTag>;
}

export default VisuallyHidden;
