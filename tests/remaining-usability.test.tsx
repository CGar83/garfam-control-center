import * as React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { createSeedData } from "@/lib/seed-data";
import { moduleConfigs } from "@/lib/modules";
import { generateIcsCalendar } from "@/lib/calendar-sync";
const state = vi.hoisted(() => ({
  privacy: false,
  query: "",
  role: "admin",
  create: vi.fn(),
  clear: vi.fn(),
  toast: vi.fn(),
  replace: vi.fn(),
}));
const data = createSeedData();
const familyId = data.families[0].id;
const storage = new Map<string, string>();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.query),
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("@/components/app/providers", () => ({
  useAppData: () => ({
    data,
    familyId,
    currentUser: { id: "test" },
    currentMember: { id: "parent", role: state.role },
    currentMemberId: "parent",
    usingLocalData: true,
    loading: false,
    createRecord: state.create,
    updateRecord: vi.fn(),
    clearCheckedGroceries: state.clear,
  }),
}));
vi.mock("@/hooks/use-privacy-mode", () => ({
  usePrivacyMode: () => ({ privacyMode: state.privacy }),
}));
vi.mock("@/hooks/use-family-members", () => ({
  useFamilyMembers: () => ({ members: [] }),
}));
vi.mock("@/hooks/use-realtime-table", () => ({
  useRealtimeTable: () => data.grocery_items,
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: state.toast }),
}));
vi.mock("@/components/pages/record-form-dialog", () => ({
  RecordFormDialog: () => null,
}));
import { ModulePage } from "@/components/pages/module-page";
import { FamilySetupChecklist } from "@/components/app/family-setup-checklist";
import DashboardPage from "@/app/dashboard/page";
import { CalendarSyncPanel } from "@/components/app/calendar-sync-panel";
const originalGroceries = [...data.grocery_items];
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  storage.clear();
  state.privacy = false;
  state.query = "";
  state.role = "admin";
  state.clear.mockReset().mockResolvedValue(undefined);
  state.create.mockReset().mockResolvedValue({});
  state.toast.mockReset();
  data.grocery_items = [
    { ...originalGroceries[0], name: "Milk", checked: true },
    { ...originalGroceries[1], name: "Bread", checked: true },
  ];
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  data.grocery_items = [...originalGroceries];
});
describe("remaining usability flows", () => {
  it("shows duplicate counts after importing an existing calendar event", async () => {
    const view = render(<CalendarSyncPanel />);
    const input = view.container.querySelector('input[type="file"]')!;
    fireEvent.change(input, {
      target: {
        files: [
          {
            size: 100,
            text: async () => generateIcsCalendar("Test", [data.events[0]]),
          },
        ],
      },
    });
    await screen.findByText(/0 events imported; 1 exact duplicates skipped/);
    expect(state.create).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Connect Google above for automatic two-way event sync/, {
        exact: false,
      }),
    ).toBeInTheDocument();
  });
  it("shows a retryable import error without reporting success", async () => {
    const view = render(<CalendarSyncPanel />);
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: { files: [{ size: 100, text: async () => "not an ICS file" }] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No supported events found",
    );
    expect(state.create).not.toHaveBeenCalled();
  });
  it("requires confirmation before clearing checked groceries", async () => {
    render(<ModulePage config={moduleConfigs.grocery} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear Checked" }));
    expect(state.clear).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Clear checked" }),
    );
    await waitFor(() => expect(state.clear).toHaveBeenCalledTimes(1));
  });
  it("lets the user select a specific recent grocery instead of copying the first", async () => {
    render(<ModulePage config={moduleConfigs.grocery} />);
    fireEvent.click(screen.getByRole("button", { name: "Add Recent" }));
    fireEvent.click(screen.getByRole("button", { name: /Bread ·/ }));
    await waitFor(() =>
      expect(state.create).toHaveBeenCalledWith(
        "grocery_items",
        expect.objectContaining({ name: "Bread", checked: false }),
      ),
    );
    expect(state.create.mock.calls[0][1].id).toBeUndefined();
  });
  it("reopens setup with real progress and permits dismissal", async () => {
    state.query = "setup=1";
    render(<FamilySetupChecklist />);
    expect(await screen.findByText("3 of 3 ready")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss family setup" }),
    );
    expect(state.replace).toHaveBeenCalledWith("/today", { scroll: false });
  });
  it("does not show the setup editor to a viewer", () => {
    state.role = "viewer";
    state.query = "setup=1";
    render(<FamilySetupChecklist />);
    expect(screen.queryByRole("region", { name: "Family setup" })).toBeNull();
  });
  it("hides household finances and health links in privacy mode", () => {
    state.privacy = true;
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", { name: "Household Review" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Check household costs" }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: /health records/ })).toBeNull();
  });
});
