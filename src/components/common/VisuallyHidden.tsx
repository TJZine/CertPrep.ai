import * as React from 'react';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: React.ElementType;
}

/**
 * Hides content visually while keeping it accessible to screen readers.
 */
export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps): React.ReactElement {
  const ComponentTag = Component as React.ElementType;
  return (
    <ComponentTag
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </ComponentTag>
  );
}

export default VisuallyHidden;
