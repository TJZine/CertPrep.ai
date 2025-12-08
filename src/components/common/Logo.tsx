import React from "react";
import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  href?: string;
}

export function Logo({
  className,
  iconClassName,
  textClassName,
  href = "/",
}: LogoProps): React.ReactElement {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 transition-opacity hover:opacity-90",
        className,
      )}
      aria-label="CertPrep.ai Home"
    >
      <BrainCircuit
        className={cn(
          "h-6 w-6 text-primary",
          iconClassName,
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          "font-bold tracking-tight text-foreground",
          textClassName,
        )}
      >
        CertPrep.ai
      </span>
    </Link>
  );
}
