import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CreatePage, { metadata } from "@/app/create/page";

// Mock the CreateBuilder component
vi.mock("@/components/create/CreateBuilder", () => ({
  CreateBuilder: (): React.ReactElement => <div data-testid="create-builder">Mock Create Builder</div>
}));

describe("CreatePage", () => {
  it("renders the CreateBuilder component", () => {
    render(<CreatePage />);
    expect(screen.getByTestId("create-builder")).toBeDefined();
    expect(screen.getByText("Mock Create Builder")).toBeDefined();
  });

  it("exports correct metadata", () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("Create Your Own Tests | CertPrep.ai");
    expect(metadata.description).toContain("Generate custom certification practice tests");
  });
});
