"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/common/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ThemeToggleButtonProps {
  className?: string;
}

export function ThemeToggleButton({
  className,
}: ThemeToggleButtonProps): React.ReactElement {
  const { toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={cn(
        "relative text-muted-foreground hover:bg-muted",
        className,
      )}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
