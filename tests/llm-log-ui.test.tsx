import * as React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const state = vi.hoisted(() => ({
  privacy: false,
  role: "parent",
  session: "",
  toast: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.session ? { session: state.session } : {}),
}));
vi.mock("@/hooks/use-privacy-mode", () => ({
  usePrivacyMode: () => ({ privacyMode: state.privacy }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: state.toast }),
}));
const session = {
  auth: {
    getSession: async () => ({ data: { session: { access_token: "test" } } }),
  },
};
vi.mock("@/components/app/providers", () => ({
  useAppData: () => ({
    familyId: "f1",
    currentUser: { id: "u1" },
    currentMember: { id: "m1", role: state.role },
    usingLocalData: false,
    supabase: session,
  }),
}));
import LlmLogPage from "@/app/llm-log/page";
const log = {
  id: "00000000-0000-4000-8000-000000000010",
  title: "Mortgage review",
  model: "model/a",
  context_key: "finance",
  message_count: 2,
  reference_enabled: true,
  created_at: "2026-09-16T00:00:00Z",
  updated_at: "2026-09-16T00:00:00Z",
  ended_at: "2026-09-16T01:00:00Z",
  memory_note: "",
  transcript_md: "# Private log\n<script>window.bad=true</script>",
};
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.privacy = false;
  state.role = "parent";
  state.session = "";
  fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (init?.method === "PATCH")
      return Response.json({ updated_at: "2026-09-16T02:00:00Z" });
    return Response.json(
      input.includes("&id=") ? { log } : { logs: [log], total: 1 },
    );
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("LLM Log interface", () => {
  it("follows a session link when the URL changes on the same page", async () => {
    const view = render(<LlmLogPage />);
    await screen.findByRole("button", { name: /Mortgage review/ });
    state.session = log.id;
    view.rerender(<LlmLogPage />);
    expect(await screen.findByLabelText("Reference note")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => c[0].includes(`&id=${log.id}`))).toBe(true);
  });
  it("loads session metadata, renders Markdown as text, and saves a reference exclusion", async () => {
    render(<LlmLogPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Mortgage review/ }),
    );
    expect(await screen.findByText(/window.bad=true/)).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Allow this session/ }),
    );
    fireEvent.change(screen.getByLabelText("Reference note"), {
      target: { value: "Keep the reserve" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => c[1]?.method === "PATCH")).toBe(
        true,
      ),
    );
    const body = JSON.parse(
      String(
        fetchMock.mock.calls.find((c) => c[1]?.method === "PATCH")![1].body,
      ),
    );
    expect(body.reference_enabled).toBe(false);
    expect(body.memory_note).toBe("Keep the reserve");
  });
  it("does not fetch logs in privacy mode or for a viewer", () => {
    state.privacy = true;
    const view = render(<LlmLogPage />);
    expect(screen.getByText(/hidden in privacy/)).toBeInTheDocument();
    state.privacy = false;
    state.role = "viewer";
    view.rerender(<LlmLogPage />);
    expect(screen.getByText(/Sign in as a parent/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("shows a confirmation before deleting a log", async () => {
    render(<LlmLogPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Mortgage review/ }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete session" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => c[1]?.method === "DELETE")).toBe(
      false,
    );
  });
});
