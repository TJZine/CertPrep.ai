"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({
  className,
  showText = true,
}: LogoProps): React.ReactElement {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG doesn't need optimization */}
      <img
        src="/full-icon.svg"
        alt="CertPrep.ai Logo"
        className="h-8 w-8 flex-shrink-0"
        width={32}
        height={32}
      />
      {showText && (
        <span className="font-heading text-xl font-bold tracking-tight text-foreground">
          CertPrep.ai
        </span>
      )}
    </div>
  );
}

