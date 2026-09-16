import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  getSession: vi.fn(),
  apply: vi.fn(),
}));
const supabase = { auth: { getSession: mocks.getSession } };
vi.mock("@/components/app/providers", () => ({
  useAppData: () => ({
    supabase,
    usingLocalData: false,
    familyId: "family-a",
    currentMember: { role: "parent" },
    applyRealtimeChange: mocks.apply,
  }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
import { FinanceAssistantPanel } from "@/components/finance/assistant-panel";

let savedModel = "test/a";
let hasKey = true;
let histories: Record<
  string,
  {
    messages: { role: string; content: string }[];
    revision: number;
    applied: string[];
  }
>;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("React", React);
  savedModel = "test/a";
  hasKey = true;
  histories = {
    "test/a": {
      messages: [
        { role: "user", content: "Our prior inquiry" },
        { role: "assistant", content: "Our saved answer" },
      ],
      revision: 1,
      applied: [],
    },
    "test/b": { messages: [], revision: 0, applied: [] },
  };
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: "test-session" } },
  });
  fetchMock = vi.fn(async (input: string, init: RequestInit) => {
    const url = new URL(input, "http://localhost");
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    let data: unknown;
    if (url.pathname.endsWith("/connection")) {
      if (body) {
        savedModel = body.model;
        if (body.api_key) hasKey = true;
        if (body.forget_key) hasKey = false;
        data = { saved: true };
      } else
        data = { model: savedModel, has_saved_key: hasKey, can_save_key: true };
    } else if (url.pathname.endsWith("/models")) {
      data = {
        models: [
          { id: "test/a", name: "Model A" },
          { id: "test/b", name: "Model B" },
        ],
      };
    } else if (url.pathname.endsWith("/conversation")) {
      const model = body?.model ?? url.searchParams.get("model")!;
      if (body)
        histories[model] = {
          messages: [],
          applied: [],
          revision: histories[model].revision + 1,
        };
      data = histories[model];
    } else if (url.pathname.endsWith("/assistant")) {
      const previous = histories[body.model];
      previous.messages.push(body.messages[0], {
        role: "assistant",
        content: "A persistent new reply",
      });
      previous.revision++;
      data = {
        message: "A persistent new reply",
        proposals: [],
        revision: previous.revision,
      };
    } else throw new Error("Unexpected request");
    return Response.json(data);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const ready = async () => {
  await screen.findByText("Our saved answer");
  await waitFor(() => expect(screen.getByLabelText("Model")).toBeEnabled());
};

describe("assistant persistence UI", () => {
  it("restores history and selected model on navigation/reload without exposing the saved key", async () => {
    const first = render(<FinanceAssistantPanel />);
    await ready();
    expect(screen.getByLabelText("API key")).toHaveValue("");
    expect(screen.getByLabelText("Model")).toHaveValue("test/a");
    first.unmount();
    render(<FinanceAssistantPanel />);
    await ready();
    expect(screen.getByLabelText("Model")).toHaveValue("test/a");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
  it("keeps conversations separate and saves a newly selected default model", async () => {
    render(<FinanceAssistantPanel />);
    await ready();
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "test/b" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save connection" }),
      ).toBeEnabled(),
    );
    expect(screen.queryByText("Our saved answer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    await waitFor(() => expect(savedModel).toBe("test/b"));
    await waitFor(() => expect(screen.getByLabelText("Model")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "test/a" },
    });
    await screen.findByText("Our saved answer");
  });
  it("clears the input after saving a key and never writes it to browser storage", async () => {
    hasKey = false;
    const local = vi.spyOn(Storage.prototype, "setItem");
    render(<FinanceAssistantPanel />);
    await ready();
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "sk-or-not-a-real-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    await waitFor(() =>
      expect(screen.getByLabelText("API key")).toHaveValue(""),
    );
    expect(hasKey).toBe(true);
    expect(local).not.toHaveBeenCalled();
    local.mockRestore();
  });
  it("retains a new reply after remount and requires consent for sending", async () => {
    const view = render(<FinanceAssistantPanel />);
    await ready();
    fireEvent.change(screen.getByLabelText("Message the finance assistant"), {
      target: { value: "Follow-up question" },
    });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("A persistent new reply");
    const body = JSON.parse(
      fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/assistant"))![1]
        .body,
    );
    expect(body.conversation_revision).toBe(1);
    expect(body.messages).toHaveLength(1);
    view.unmount();
    render(<FinanceAssistantPanel />);
    await screen.findByText("A persistent new reply");
  });
  it("requires confirmation to clear history and leaves the key intact", async () => {
    render(<FinanceAssistantPanel />);
    await ready();
    fireEvent.click(
      screen.getByRole("button", { name: "Clear this model's conversation" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancel",
      }),
    );
    expect(histories["test/a"].messages).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Clear this model's conversation" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Clear conversation",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText("Our saved answer")).not.toBeInTheDocument(),
    );
    expect(hasKey).toBe(true);
  });
});
