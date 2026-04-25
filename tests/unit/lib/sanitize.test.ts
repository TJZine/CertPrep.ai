import { describe, expect, it } from "vitest";
import { sanitizeHTML } from "@/lib/utils/sanitize";

describe("sanitizeHTML", () => {
  it("strips script tags", () => {
    const sanitized = sanitizeHTML("<script>alert(1)</script><b>ok</b>");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("alert(1)");
    expect(sanitized).toContain("<b>ok</b>");
  });

  it("strips inline event handlers", () => {
    const sanitized = sanitizeHTML('<b onclick="alert(1)">ok</b>');
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).toContain("<b>ok</b>");
  });

  it("preserves allowed tags", () => {
    const sanitized = sanitizeHTML("<code>const x = 1</code>");
    expect(sanitized).toContain("<code>");
    expect(sanitized).toContain("</code>");
  });
});
