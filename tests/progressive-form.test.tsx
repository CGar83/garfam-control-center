import * as React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { moduleConfigs } from "@/lib/modules";
const state = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), close: vi.fn() }));
vi.mock("@/components/app/providers", () => ({ useAppData: () => ({ createRecord: state.create, updateRecord: state.update, currentMemberId: "parent" }) }));
vi.mock("@/hooks/use-family-members", () => ({ useFamilyMembers: () => ({ members: [] }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
beforeEach(() => { vi.stubGlobal("React", React); state.create.mockReset().mockResolvedValue({}); state.close.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("progressive record forms", () => {
  it("starts with essentials and retains optional input when details are collapsed", async () => {
    render(<RecordFormDialog config={moduleConfigs.tasks} open onOpenChange={state.close} />);
    const details = screen.getByText("More details").closest("details")!;
    expect(details.open).toBe(false);
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Plan school trip" } });
    fireEvent.click(screen.getByText("More details"));
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Bring the signed form" } });
    fireEvent.click(screen.getByText("More details"));
    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
    await waitFor(() => expect(state.create).toHaveBeenCalled());
    expect(state.create.mock.calls[0][1]).toMatchObject({ title: "Plan school trip", notes: "Bring the signed form" });
  });
  it("blocks invalid input and reveals details for correction", async () => {
    render(<RecordFormDialog config={moduleConfigs.tasks} open onOpenChange={state.close} />);
    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("More details").closest("details")!.open).toBe(true);
    expect(state.create).not.toHaveBeenCalled();
  });
});
