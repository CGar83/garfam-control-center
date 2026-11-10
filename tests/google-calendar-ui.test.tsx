import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const state = vi.hoisted(() => ({
  privacy: false,
  role: "admin",
  local: false,
  toast: vi.fn(),
}));
const supabase = {
  auth: {
    getSession: async () => ({
      data: { session: { access_token: "test-token" } },
    }),
  },
};
vi.mock("@/components/app/providers", () => ({
  useAppData: () => ({
    familyId: "family-one",
    currentMember: { id: "parent", role: state.role },
    usingLocalData: state.local,
    supabase,
  }),
}));
vi.mock("@/hooks/use-privacy-mode", () => ({
  usePrivacyMode: () => ({ privacyMode: state.privacy }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: state.toast }),
}));
import { GoogleSyncPanel } from "@/components/calendar/google-sync-panel";
const metadata = {
  configured: true,
  calendars: [{ id: "dedicated", summary: "Family Calendar" }],
  conflicts: [],
  connection: {
    id: "link",
    owner: true,
    status: "choose_calendar",
    calendarId: null,
    calendarName: null,
    timeZone: "America/Los_Angeles",
    lastAttempt: null,
    lastSuccess: null,
    error: null,
    inProgress: false,
    more: false,
  },
};
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.privacy = false;
  state.role = "admin";
  state.local = false;
  window.history.replaceState(null, "", "/calendar");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(metadata)),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("requires an explicit calendar choice and sharing consent, then scopes the mutation", async () => {
  render(<GoogleSyncPanel />);
  const button = await screen.findByRole("button", {
    name: "Start two-way sync",
  });
  expect(button).toBeDisabled();
  expect(screen.getByRole("combobox")).toHaveValue("");
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "dedicated" },
  });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/Share titles/));
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify({
          action: "select",
          calendar_id: "dedicated",
          consent: true,
          include_existing: false,
          family_id: "family-one",
        }),
      }),
    ),
  );
});
it("hides Google details in privacy mode", async () => {
  state.privacy = true;
  render(<GoogleSyncPanel />);
  expect(screen.getByText(/hidden in privacy mode/)).toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByText("Family Calendar")).not.toBeInTheDocument();
});
it("does not request private server metadata for local or viewer profiles", () => {
  state.role = "viewer";
  render(<GoogleSyncPanel />);
  expect(screen.getByText(/Sign in as a parent/)).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
it("shows a failed lookup accurately, keeps Google's actionable message on refresh, and recovers", async () => {
  let failing = true;
  const message = "Google Calendar API is disabled for your OAuth project.";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("calendars=1"))
        return failing
          ? Response.json({ error: message }, { status: 403 })
          : Response.json(metadata);
      return Response.json({ ...metadata, calendars: [] });
    }),
  );
  render(<GoogleSyncPanel />);
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(
    screen.queryByText(/No writable calendars found/),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/Calendar choices could not be loaded/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(message),
  );
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole("option", { name: "Family Calendar" }),
  ).toBeInTheDocument();
});
