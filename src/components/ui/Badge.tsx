'use client';

import * as React from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/70 dark:bg-blue-900/30 dark:text-blue-100',
        secondary: 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
        success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800/70 dark:bg-green-900/30 dark:text-green-100',
        danger: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/70 dark:bg-red-900/30 dark:text-red-100',
        warning: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800/70 dark:bg-orange-900/30 dark:text-orange-100',
        outline: 'border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
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
