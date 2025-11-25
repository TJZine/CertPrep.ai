'use client';

import * as React from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-blue-200 bg-blue-50 text-blue-800',
        secondary: 'border-slate-200 bg-slate-100 text-slate-800',
        success: 'border-green-200 bg-green-50 text-green-800',
        danger: 'border-red-200 bg-red-50 text-red-800',
        warning: 'border-orange-200 bg-orange-50 text-orange-800',
        outline: 'border-slate-300 bg-white text-slate-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * Badge component for status indicators.
 */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): React.ReactElement {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export default Badge;
