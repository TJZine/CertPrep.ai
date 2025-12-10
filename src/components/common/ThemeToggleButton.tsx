"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme, THEME_CONFIG } from "@/components/common/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ThemeToggleButtonProps {
  className?: string;
}

export function ThemeToggleButton({
  className,
}: ThemeToggleButtonProps): React.ReactElement {
  const { toggleTheme, resolvedTheme } = useTheme();
  const isDark = THEME_CONFIG[resolvedTheme]?.isDark ?? false;

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
      <Sun className={cn("h-5 w-5 transition-all", isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100")} />
      <Moon className={cn("absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transition-all", isDark ? "rotate-0 scale-100" : "rotate-90 scale-0")} />
    </Button>
  );
}
