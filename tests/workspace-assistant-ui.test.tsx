import * as React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ privacy: false, role: "parent" }));
vi.mock("@/hooks/use-privacy-mode", () => ({
  usePrivacyMode: () => ({ privacyMode: state.privacy }),
}));
vi.mock("@/components/app/providers", () => ({
  useAppData: () => ({
    data: { bills: [{ id: "bill1", family_id: "f1", name: "Electric bill" }] },
    familyId: "f1",
    currentUser: { id: "u1" },
    currentMember: { id: "m1", role: state.role },
    usingLocalData: false,
    supabaseConfigured: true,
  }),
}));
vi.mock("@/components/finance/assistant-panel", () => ({
  FinanceAssistantPanel: ({ context }: { context: unknown }) => (
    <div data-testid="assistant-context">{JSON.stringify(context)}</div>
  ),
}));
import { WorkspaceAssistant } from "@/components/assistant/workspace-assistant";
import { SourceEvidence } from "@/components/assistant/source-evidence";
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.privacy = false;
  state.role = "parent";
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("workspace review controls", () => {
  it("requires sensitive inclusion before loading a finance conversation", () => {
    render(<WorkspaceAssistant page="/bills" />);
    expect(screen.queryByTestId("assistant-context")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Finances/ }));
    expect(screen.getByTestId("assistant-context")).toHaveTextContent(
      '"sections":["finances"]',
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Finances/ }));
    expect(screen.queryByTestId("assistant-context")).not.toBeInTheDocument();
  });
  it("keeps sensitive sections off when broadening to workspace review", () => {
    render(<WorkspaceAssistant page="/bills" />);
    fireEvent.change(screen.getByLabelText("Review scope"), {
      target: { value: "workspace" },
    });
    expect(screen.getByRole("checkbox", { name: /Health/ })).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Relationship/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Finances/ }),
    ).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /Health/ }));
    expect(screen.getByTestId("assistant-context")).toHaveTextContent(
      '"health"',
    );
  });
  it("passes an exact selected record only after its sensitive section is checked", () => {
    render(
      <WorkspaceAssistant
        page="/bills"
        target={{ table: "bills", id: "bill1" }}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Finances/ }));
    expect(screen.getByTestId("assistant-context")).toHaveTextContent(
      '"record":{"table":"bills","id":"bill1"}',
    );
  });
  it("hides the assistant in privacy mode and denies viewer profiles", () => {
    state.privacy = true;
    const view = render(<WorkspaceAssistant page="/bills" />);
    expect(screen.getByText(/hidden while privacy/)).toBeInTheDocument();
    state.privacy = false;
    state.role = "viewer";
    view.rerender(<WorkspaceAssistant page="/bills" />);
    expect(screen.getByText(/Sign in as a parent/)).toBeInTheDocument();
    expect(screen.queryByTestId("assistant-context")).not.toBeInTheDocument();
  });
  it("shows source links and incomplete matching-record coverage", () => {
    render(
      <SourceEvidence
        sources={[
          {
            ref: "S1",
            table: "bills",
            id: "b1",
            title: "Electric bill",
            updated_at: "2026-09-16T00:00:00Z",
          },
        ]}
        coverage={[
          {
            table: "bills",
            included: 1,
            available: 12,
            clipped: true,
            date_filtered: true,
          },
        ]}
        content="Review [S1]"
      />,
    );
    fireEvent.click(screen.getByText(/Records supplied/));
    expect(screen.getByText(/1 of 12/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Electric bill/ })).toHaveAttribute(
      "href",
      "/bills?record=b1",
    );
  });
});
