"use client";

import * as Sentry from "@sentry/nextjs";
import { type ReactElement, useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error;
}): ReactElement {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>{/* Your Error component here... */}</body>
    </html>
  );
}
