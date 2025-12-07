"use client";

import * as React from "react";
import { XCircle, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface A11yIssue {
  type: "error" | "warning" | "info";
  message: string;
  element?: string | null;
  fix?: string;
}

/**
 * Development-only component to check basic accessibility issues.
 */
export function AccessibilityChecker(): React.ReactElement | null {
  const [issues, setIssues] = React.useState<A11yIssue[]>([]);
  const [isChecking, setIsChecking] = React.useState(false);
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const runCheck = (): void => {
    setIsChecking(true);
    const foundIssues: A11yIssue[] = [];

    document.querySelectorAll("img:not([alt])").forEach((img) => {
      foundIssues.push({
        type: "error",
        message: "Image missing alt attribute",
        element: img.outerHTML.substring(0, 100),
        fix: 'Add alt="" for decorative images or descriptive alt text',
      });
    });

    document.querySelectorAll("button").forEach((button) => {
      const hasText = button.textContent?.trim();
      const hasAriaLabel = button.getAttribute("aria-label");
      const hasAriaLabelledBy = button.getAttribute("aria-labelledby");

      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        foundIssues.push({
          type: "error",
          message: "Button without accessible name",
          element: button.outerHTML.substring(0, 100),
          fix: "Add text content, aria-label, or aria-labelledby",
        });
      }
    });

    document.querySelectorAll("input, select, textarea").forEach((input) => {
      const id = input.getAttribute("id");
      const hasAriaLabel = input.getAttribute("aria-label");
      const hasAriaLabelledBy = input.getAttribute("aria-labelledby");
      const hasAssociatedLabel = id
        ? document.querySelector(`label[for="${id}"]`)
        : null;

      if (!hasAriaLabel && !hasAriaLabelledBy && !hasAssociatedLabel) {
        foundIssues.push({
          type: "error",
          message: "Form input without associated label",
          element: input.outerHTML.substring(0, 100),
          fix: 'Add <label for="id"> or aria-label attribute',
        });
      }
    });

    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
    );
    let previousLevel = 0;
    headings.forEach((heading) => {
      const level = Number.parseInt(heading.tagName.substring(1), 10);
      if (level > previousLevel + 1 && previousLevel !== 0) {
        foundIssues.push({
          type: "warning",
          message: `Heading level skipped (h${previousLevel} to h${level})`,
          element: heading.textContent?.substring(0, 50) ?? null,
          fix: "Use heading levels in order (h1, h2, h3...)",
        });
      }
      previousLevel = level;
    });

    if (!document.querySelector('main, [role="main"]')) {
      foundIssues.push({
        type: "warning",
        message: "No main landmark found",
        fix: "Wrap main content in <main> element",
      });
    }

    foundIssues.push({
      type: "info",
      message: "Color contrast requires manual verification",
      fix: "Use browser dev tools or axe to check contrast ratios",
    });

    foundIssues.push({
      type: "info",
      message: "Focus visibility requires manual testing",
      fix: "Tab through all interactive elements to verify focus rings",
    });

    setIssues(foundIssues);
    setLastChecked(new Date());
    setIsChecking(false);
  };

  const errorCount = issues.filter((issue) => issue.type === "error").length;
  const warningCount = issues.filter(
    (issue) => issue.type === "warning",
  ).length;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <Card className="w-96 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Accessibility Checker</CardTitle>
            <Badge variant="secondary">Dev Only</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runCheck}
            isLoading={isChecking}
            size="sm"
            className="mb-4 w-full"
          >
            Run Check
          </Button>

          {lastChecked ? (
            <div className="mb-4 flex gap-4 text-sm">
              <div className="flex items-center gap-1 text-red-600">
                <XCircle className="h-4 w-4" />
                {errorCount} errors
              </div>
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                {warningCount} warnings
              </div>
            </div>
          ) : null}

          {issues.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {issues.map((issue, index) => (
                <div
                  key={`${issue.message}-${index}`}
                  className={`rounded-lg border p-2 text-xs ${
                    issue.type === "error"
                      ? "border-red-200 bg-red-50"
                      : issue.type === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {issue.type === "error" && (
                      <XCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
                    )}
                    {issue.type === "warning" && (
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
                    )}
                    {issue.type === "info" && (
                      <Info className="h-4 w-4 flex-shrink-0 text-blue-600" />
                    )}
                    <div>
                      <p className="font-medium">{issue.message}</p>
                      {issue.fix ? (
                        <p className="mt-1 text-slate-600">Fix: {issue.fix}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default AccessibilityChecker;
