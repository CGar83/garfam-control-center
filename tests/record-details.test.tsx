import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createSeedData } from "@/lib/seed-data";
const state = vi.hoisted(() => ({ query: "", path: "/tasks", privacy: false, role: "parent", blocked: [] as string[], replace: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path, useSearchParams: () => new URLSearchParams(state.query), useRouter: () => ({ replace: state.replace }) }));
vi.mock("@/hooks/use-privacy-mode", () => ({ usePrivacyMode: () => ({ privacyMode: state.privacy }) }));
vi.mock("@/components/pages/record-form-dialog", () => ({ RecordFormDialog: () => <p>Edit form</p> }));
const data = createSeedData();
vi.mock("@/components/app/providers", () => ({ useAppData: () => ({ data, familyId: data.tasks[0].family_id, currentMember: { role: state.role, blocked_sections: state.blocked }, loading: false }) }));
import { RecordDetails } from "@/components/app/record-details";
beforeEach(() => { vi.stubGlobal("React", React); state.path = "/tasks"; state.privacy = false; state.role = "parent"; state.blocked = []; state.query = `record=${data.tasks[0].id}&table=tasks`; state.replace.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("record deep links", () => {
  it("opens the exact saved record and closes without removing unrelated filters", () => {
    state.query += "&view=list";
    render(<RecordDetails />);
    expect(screen.getByRole("heading", { name: data.tasks[0].title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to page" }));
    expect(state.replace).toHaveBeenCalledWith("/tasks?view=list", { scroll: false });
  });
  it("does not reveal record content in privacy mode", () => { state.privacy = true; render(<RecordDetails />); expect(screen.queryByText(data.tasks[0].title)).toBeNull(); expect(screen.getByText(/hidden in privacy/)).toBeInTheDocument(); });
  it("rejects a table for a different destination", () => { state.path = "/grocery"; render(<RecordDetails />); expect(screen.queryByText(data.tasks[0].title)).toBeNull(); expect(screen.getByText(/no longer available/)).toBeInTheDocument(); });
  it("does not offer editing to viewers", () => { state.role = "viewer"; render(<RecordDetails />); expect(screen.queryByRole("button", { name: "Edit record" })).toBeNull(); });
  it("does not expose restricted section records", () => { state.path = "/health"; state.role = "viewer"; state.blocked = ["health"]; state.query = `record=${data.health_records[0].id}&table=health_records`; render(<RecordDetails />); expect(screen.getByText(/unavailable for this profile/)).toBeInTheDocument(); });
  it("handles a removed record without displaying details", () => { state.query = "record=unavailable&table=tasks"; render(<RecordDetails />); expect(screen.getByText(/no longer available/)).toBeInTheDocument(); });
  it("does not open a record belonging to another workspace", () => {
    const original = data.tasks[1].family_id;
    data.tasks[1].family_id = "another-family";
    state.query = `record=${data.tasks[1].id}&table=tasks`;
    try { render(<RecordDetails />); expect(screen.getByText(/no longer available/)).toBeInTheDocument(); expect(screen.queryByText(data.tasks[1].title)).toBeNull(); }
    finally { data.tasks[1].family_id = original; }
  });
});
