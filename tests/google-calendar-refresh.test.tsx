import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
const state = vi.hoisted(() => ({
  apply: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  pending: 0,
  count: 1,
  rows: [] as Record<string, unknown>[],
  events: [] as Record<string, unknown>[],
}));
const supabase = {
  from: () => ({
    select: (...args: unknown[]) => {
      state.select(...args);
      return {
        eq: (...filter: unknown[]) => {
          state.eq(...filter);
          return {
            limit: async () => ({
              data: state.rows,
              count: state.count,
              error: null,
            }),
          };
        },
      };
    },
  }),
};
vi.mock("@/components/app/providers", () => ({
  useAppData: () => ({
    familyId: "family-one",
    currentMember: { id: "viewer", role: "viewer" },
    usingLocalData: false,
    supabase,
    data: { events: state.events },
    applyRealtimeChange: state.apply,
    pendingSyncCount: state.pending,
  }),
}));
vi.mock("@/hooks/use-realtime-table", () => ({ useRealtimeTable: vi.fn() }));
import { GoogleSyncBridge } from "@/components/calendar/google-sync-bridge";
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.apply.mockReset();
  state.eq.mockReset();
  state.select.mockReset();
  state.pending = 0;
  state.count = 1;
  state.events = [
    {
      id: "deleted",
      family_id: "family-one",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ];
  state.rows = [
    {
      id: "imported",
      family_id: "family-one",
      updated_at: "2026-01-02T00:00:00Z",
    },
  ];
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("refreshes imports and deletions with a complete family-scoped snapshot", async () => {
  render(<GoogleSyncBridge />);
  await waitFor(() =>
    expect(state.apply).toHaveBeenCalledWith("events", "DELETE", null, {
      id: "deleted",
    }),
  );
  expect(state.apply).toHaveBeenCalledWith("events", "UPDATE", state.rows[0]);
  expect(state.eq).toHaveBeenCalledWith("family_id", "family-one");
  expect(state.select).toHaveBeenCalledWith("*", { count: "exact" });
});
it("does not reconcile a truncated server snapshot", async () => {
  state.count = 1005;
  render(<GoogleSyncBridge />);
  await waitFor(() => expect(state.eq).toHaveBeenCalled());
  expect(state.apply).not.toHaveBeenCalled();
});
it("does not remove recent local edits or overwrite newer rows", async () => {
  state.events = [
    { id: "deleted", updated_at: new Date().toISOString() },
    { id: "imported", updated_at: "2026-12-01T00:00:00Z" },
  ];
  render(<GoogleSyncBridge />);
  await waitFor(() => expect(state.eq).toHaveBeenCalled());
  expect(state.apply).not.toHaveBeenCalled();
});
it("leaves queued offline changes alone", () => {
  state.pending = 1;
  render(<GoogleSyncBridge />);
  expect(state.eq).not.toHaveBeenCalled();
  expect(state.apply).not.toHaveBeenCalled();
});
