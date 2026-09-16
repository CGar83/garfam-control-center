"use client";

import { useRef, useState } from "react";
import {
  Check,
  KeyRound,
  LoaderCircle,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/components/app/providers";
import { useToast } from "@/hooks/use-toast";
import type { FinanceProposal } from "@/lib/finance/assistant";
import { titleCase } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  proposals?: FinanceProposal[];
}
interface Model {
  id: string;
  name: string;
  pricing?: { prompt: string; completion: string };
}

export function FinanceAssistantPanel() {
  const {
    supabase,
    usingLocalData,
    familyId,
    applyRealtimeChange,
    currentMember,
  } = useAppData();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const activeRequest = useRef(false);
  const allowed =
    !usingLocalData &&
    !!supabase &&
    !!currentMember &&
    ["admin", "parent"].includes(currentMember.role);

  async function headers() {
    const session = await supabase?.auth.getSession();
    if (!session?.data.session)
      throw new Error("Sign in to your family workspace first.");
    return {
      Authorization: `Bearer ${session.data.session.access_token}`,
      "Content-Type": "application/json",
      ...(apiKey ? { "x-openrouter-key": apiKey } : {}),
    };
  }

  async function request(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: await headers(),
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Request failed.");
    return result;
  }

  async function run(work: () => Promise<void>) {
    if (activeRequest.current) return;
    activeRequest.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete the request.",
      );
    } finally {
      activeRequest.current = false;
      setBusy(false);
    }
  }

  async function send() {
    const text = prompt.trim();
    if (!text || !consent || !model || !allowed) return;
    await run(async () => {
      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ].slice(-11);
      const result = await request("/api/finance/assistant", {
        family_id: familyId,
        model,
        share_financial_context: true,
        messages: history,
      });
      setMessages((previous) => [
        ...previous,
        { role: "user", content: text },
        {
          role: "assistant",
          content: result.message,
          proposals: result.proposals,
        },
      ]);
      setPrompt("");
    });
  }

  return (
    <section className="grid min-w-0 gap-7 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-5 xl:border-r xl:pr-7">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <KeyRound className="h-4 w-4" />
            OpenRouter connection
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your own key and choose a model. Your key stays in memory until
            you leave this page.
          </p>
        </div>
        {!allowed && (
          <p className="rounded-lg border p-3 text-sm">
            Sign in as a parent or admin in Settings to connect the assistant.
          </p>
        )}
        <label className="block space-y-2 text-sm font-medium">
          API key
          <Input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-..."
            disabled={busy || !allowed}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Leave blank when your workspace has a server connection. No key is
          written to browser storage or family records.
        </p>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            Workspace connection details
          </summary>
          <p className="mt-2">Workspace ID for the server allowlist:</p>
          <code className="mt-1 block break-all select-all">{familyId}</code>
        </details>
        <Button
          variant="outline"
          className="w-full"
          disabled={!allowed || busy}
          onClick={() =>
            void run(async () => {
              const result = await request(
                `/api/finance/models?family_id=${encodeURIComponent(familyId)}`,
              );
              setModels(result.models);
              if (!result.models.some((m: Model) => m.id === model))
                setModel("");
              toast({
                title: "OpenRouter connected",
                description: `${result.models.length} tool-capable models available.`,
                variant: "success",
              });
            })
          }
        >
          Connect & load models
        </Button>
        <label className="block space-y-2 text-sm font-medium">
          Model
          <select
            className="h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={busy || !allowed}
          >
            <option value="">Choose a model</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        {models.find((m) => m.id === model)?.pricing && (
          <p className="text-xs text-muted-foreground">
            Per million tokens: $
            {(
              Number(models.find((m) => m.id === model)?.pricing?.prompt) * 1e6
            ).toFixed(2)}{" "}
            input / $
            {(
              Number(models.find((m) => m.id === model)?.pricing?.completion) *
              1e6
            ).toFixed(2)}{" "}
            output. Billed by OpenRouter.
          </p>
        )}
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 accent-primary"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={busy || !allowed}
          />
          <span>
            Share this workspace&apos;s financial records and my messages with
            OpenRouter and the selected model provider.
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          Account login details, family health, and relationship records are
          excluded. Review every proposed change before applying it. Payments
          and provider cancellations stay with you.
        </p>
        <Button
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setApiKey("");
            setModels([]);
            setModel("");
            setMessages([]);
            setApplied(new Set());
            setConsent(false);
            setError("");
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear connection & chat
        </Button>
        <a
          href="https://openrouter.ai/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-primary underline"
        >
          Manage OpenRouter keys
        </a>
      </aside>
      <div className="min-w-0 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            Your financial strategy assistant
          </h2>
        </div>
        {!messages.length && (
          <div className="border-y py-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Start with a question or a specific change.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "What needs attention in my recovery plan?",
                "Compare my subscription costs with my allowance.",
                "Create a high-priority action to verify every card's autopay this week.",
                "What information is missing before I can compare payoff strategies?",
              ].map((s) => (
                <button
                  key={s}
                  className="rounded-lg border p-3 text-left text-sm transition hover:bg-muted focus-ring"
                  onClick={() => setPrompt(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div
          className="max-h-[60vh] space-y-5 overflow-y-auto"
          aria-live="polite"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-6 rounded-lg bg-muted p-4"
                  : "border-b pb-5"
              }
            >
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {m.role === "user" ? "You" : "Assistant"}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {m.content}
              </p>
              {m.proposals?.map((p) => (
                <div key={p.request_id} className="mt-4 rounded-lg border p-4">
                  <p className="text-sm font-semibold">{p.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {titleCase(p.operation)} · {titleCase(p.table)}
                  </p>
                  <dl className="my-3 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 text-xs">
                    {Object.entries(p.values).map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-muted-foreground">
                          {titleCase(k)}
                        </dt>
                        <dd className="break-words">
                          {v === null ? "Not set" : String(v)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Button
                    size="sm"
                    disabled={busy || applied.has(p.request_id)}
                    onClick={() =>
                      void run(async () => {
                        const result = await request("/api/finance/actions", {
                          family_id: familyId,
                          proposal: p,
                        });
                        applyRealtimeChange(
                          result.table,
                          p.operation === "create" ? "INSERT" : "UPDATE",
                          result.record,
                        );
                        setApplied((prev) => new Set([...prev, p.request_id]));
                        toast({
                          title: "Change saved",
                          description: p.summary,
                          variant: "success",
                        });
                      })
                    }
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {applied.has(p.request_id)
                      ? "Saved to workspace"
                      : "Apply this change"}
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <form
          className="space-y-3 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="finance-prompt" className="sr-only">
            Message the finance assistant
          </label>
          <Textarea
            id="finance-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={6000}
            placeholder="Ask about your plan, or describe a change..."
            disabled={busy}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Changes require your review. Chat is cleared when you leave this
              page.
            </span>
            <Button
              type="submit"
              disabled={
                busy || !allowed || !consent || !model || !prompt.trim()
              }
            >
              {busy ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
