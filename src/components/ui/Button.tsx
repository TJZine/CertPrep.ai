"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        danger:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        success:
          "bg-green-600 text-white shadow-sm hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500", // Keeping success as-is for now, or could map to a new 'success' token if desired
        warning:
          "bg-orange-500 text-white shadow-sm hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Accessible button component with variants, icon slots, and loading state.
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  /**
   * If true, displays a loading spinner and disables interaction.
   * Signals busy/loading state to screen readers via aria-busy.
   *
   * @default false
   */
  isLoading?: boolean;
  /**
   * Icon element to render before the button text.
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon element to render after the button text.
   */
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const iconSize =
      size === "sm" || size === "icon-sm"
        ? "h-4 w-4"
        : size === "lg" || size === "xl"
          ? "h-5 w-5"
          : "h-4 w-4";

    const renderIcon = (icon: React.ReactNode): React.ReactNode =>
      icon ? (
        <span aria-hidden="true" className={cn("flex items-center", iconSize)}>
          {icon}
        </span>
      ) : null;

    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2
            className={cn("animate-spin", iconSize)}
            aria-hidden="true"
          />
        ) : (
          renderIcon(leftIcon)
        )}
        <span className="whitespace-nowrap">{children}</span>
        {renderIcon(rightIcon)}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
