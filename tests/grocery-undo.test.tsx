import { renderHook, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSeedData } from "@/lib/seed-data";
const state = vi.hoisted(() => ({
  family: "family",
  member: "parent",
  update: vi.fn(),
  toast: vi.fn(),
}));
const data = createSeedData();
vi.mock("@/components/app/providers", () => ({
  useAppData: () => ({
    familyId: state.family,
    currentMemberId: state.member,
    data,
    updateRecord: state.update,
  }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: state.toast }),
}));
import { useGroceryCheck } from "@/hooks/use-grocery-check";
beforeEach(() => {
  state.family = "family";
  state.member = "parent";
  state.update.mockReset().mockResolvedValue({});
  state.toast.mockReset();
});
afterEach(cleanup);
describe("grocery recovery", () => {
  it("checks an item and offers an undo that restores it", async () => {
    const { result } = renderHook(useGroceryCheck);
    const item = data.grocery_items[0];
    await act(() => result.current(item, true));
    const action = state.toast.mock.calls[0][0].action;
    expect(action.label).toBe("Undo");
    await act(() => action.onClick());
    expect(state.update).toHaveBeenLastCalledWith("grocery_items", item.id, {
      checked: false,
    });
  });
  it("does not carry an undo across workspace or profile switches", async () => {
    const { result, rerender } = renderHook(useGroceryCheck);
    await act(() => result.current(data.grocery_items[0], true));
    const action = state.toast.mock.calls[0][0].action;
    state.family = "other";
    rerender();
    await act(() => action.onClick());
    expect(state.update).toHaveBeenCalledTimes(1);
    expect(state.toast).toHaveBeenLastCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
  });
  it("reports failed saves without offering a false undo", async () => {
    state.update.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(useGroceryCheck);
    await act(() => result.current(data.grocery_items[0], true));
    expect(state.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Could not update grocery item",
        variant: "destructive",
      }),
    );
    expect(state.toast.mock.calls[0][0].action).toBeUndefined();
  });
});
