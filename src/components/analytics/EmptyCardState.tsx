"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface EmptyCardStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  headerIcon?: React.ReactNode;
}

/**
 * Standardized empty state component for analytics cards.
 * Ensures consistent visual treatment and messaging across the dashboard.
 */
export function EmptyCardState({
  icon,
  title,
  description,
  action,
  className,
  headerIcon,
}: EmptyCardStateProps): React.ReactElement {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {headerIcon || icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center py-6 text-center">
        <div className="mb-4 text-muted-foreground opacity-50">
           {/* Clone the icon to potentially adjust size if needed, though usually passed as is */}
           {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
             className: cn("h-12 w-12", (icon as React.ReactElement<{ className?: string }>).props.className)
           }) : icon}
        </div>
        <p className="max-w-[80%] text-sm text-muted-foreground">
          {description}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}
