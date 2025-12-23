"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps
    extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
    options: SelectOption[];
    placeholder?: string;
    onChange?: (value: string) => void;
}

/**
 * Styled native select component with custom appearance.
 *
 * Uses native `<select>` for accessibility and mobile-native pickers,
 * with custom styling to match the design system.
 */
export function Select({
    options,
    placeholder,
    value,
    onChange,
    className,
    disabled,
    ...props
}: SelectProps): React.ReactElement {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        onChange?.(event.target.value);
    };

    return (
        <div className="relative inline-block">
            <select
                value={value}
                onChange={handleChange}
                disabled={disabled}
                className={cn(
                    // Base styles
                    "h-9 w-full appearance-none rounded-md border border-input bg-background",
                    "pl-3 pr-8 text-sm text-foreground",
                    // Focus states
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                    // Hover state
                    "hover:border-ring/50 transition-colors",
                    // Disabled state
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                className={cn(
                    "pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                    disabled && "opacity-50"
                )}
                aria-hidden="true"
            />
        </div>
    );
}

export default Select;
