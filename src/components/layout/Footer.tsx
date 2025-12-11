"use client";

import * as React from "react";
import { Shield } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

/**
 * Application footer with privacy messaging.
 */
export function Footer(): React.ReactElement {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="font-semibold text-foreground">
            {APP_NAME}
          </span>
          <span className="text-muted-foreground">
            v{APP_VERSION}
          </span>
          <span className="text-muted-foreground">
            Professional exam simulator
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" aria-hidden="true" />
          <span>Secure & Private: Local-First with Cloud Sync</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
