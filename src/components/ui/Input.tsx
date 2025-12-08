"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Text label displayed above the input.
   * Automatically associates with the input via `htmlFor`.
   */
  label?: string;
  /**
   * Error message displayed below the input in red.
   * Sets `aria-invalid` to true and links via `aria-describedby`.
   */
  error?: string;
  /**
   * Informational text displayed below the input.
   * Can be displayed alongside an error. Links via `aria-describedby`.
   */
  helperText?: string;
}

/**
 * Accessible text input with label, helper text, and error state.
 */
export const Input = ({
  className,
  label,
  error,
  helperText,
  id,
  ref,
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }): React.ReactElement => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy =
    [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex w-full flex-col gap-2">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium leading-none"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus-visible:ring-red-500",
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {helperText ? (
        <p id={helperId} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

Input.displayName = "Input";

export default Input;
