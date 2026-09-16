"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  KeyRound,
  LoaderCircle,
  Send,
  Sparkles,
  Trash2,
  Save,
  RotateCcw,
  Plus,
  NotebookText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/components/app/providers";
import { useToast } from "@/hooks/use-toast";
import type { FinanceProposal } from "@/lib/finance/assistant";
import { titleCase } from "@/lib/utils";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import {
  tablesForContext,
  type AssistantContext,
  type AssistantSource,
  type AssistantCoverage,
} from "@/lib/assistant/context";
import { SourceEvidence } from "@/components/assistant/source-evidence";
import type { LogReference } from "@/lib/assistant/logs";

interface Message {
  role: "user" | "assistant";
  content: string;
  proposals?: FinanceProposal[];
  sources?: AssistantSource[];
  coverage?: AssistantCoverage[];
  fetched_at?: string;
  log_references?: LogReference[];
}
interface Model {
  id: string;
  name: string;
  pricing?: { prompt: string; completion: string };
}

export function FinanceAssistantPanel({
  context,
}: { context?: AssistantContext } = {}) {
  const contextQuery = context
    ? `&context=${encodeURIComponent(JSON.stringify(context))}`
    : "";
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
  const [referenceLogs, setReferenceLogs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [canSaveKey, setCanSaveKey] = useState(false);
  const [savedModel, setSavedModel] = useState("");
  const [revision, setRevision] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<"key" | "history" | "new" | null>(
    null,
  );
  const activeRequest = useRef(false);
  const allowed =
    !usingLocalData &&
    !!supabase &&
    !!currentMember &&
    ["admin", "parent"].includes(currentMember.role);

  const request = useCallback(
    async (path: string, body?: unknown, key?: string) => {
      const session = await supabase?.auth.getSession();
      if (!session?.data.session)
        throw new Error("Sign in to your family workspace first.");
      const headers = {
        Authorization: `Bearer ${session.data.session.access_token}`,
        "Content-Type": "application/json",
        ...(key ? { "x-openrouter-key": key } : {}),
      };
      const response = await fetch(path, {
        method: body ? "POST" : "GET",
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Request failed.");
      return result;
    },
    [supabase],
  );

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setRestoring(true);
    void (async () => {
      try {
        const connection = await request(
          `/api/finance/connection?family_id=${encodeURIComponent(familyId)}`,
        );
        if (!active) return;
        setStorageReady(true);
        setCanSaveKey(connection.can_save_key);
        setHasSavedKey(connection.has_saved_key);
        setSavedModel(connection.model);
        setModel(connection.model);
        if (connection.model) {
          const history = await request(
            `/api/finance/conversation?family_id=${encodeURIComponent(familyId)}&model=${encodeURIComponent(connection.model)}${contextQuery}`,
          );
          if (!active) return;
          setMessages(history.messages);
          setRevision(history.revision);
          setApplied(new Set(history.applied));
        }
        if (connection.has_saved_key || connection.model) {
          const catalog = await request(
            `/api/finance/models?family_id=${encodeURIComponent(familyId)}`,
          );
          if (active) setModels(catalog.models);
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not restore the assistant.",
          );
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [allowed, familyId, request, contextQuery]);

  async function restoreHistory(nextModel: string) {
    setMessages([]);
    setApplied(new Set());
    setRevision(null);
    if (nextModel && storageReady) {
      const history = await request(
        `/api/finance/conversation?family_id=${encodeURIComponent(familyId)}&model=${encodeURIComponent(nextModel)}${contextQuery}`,
      );
      setMessages(history.messages);
      setRevision(history.revision);
      setApplied(new Set(history.applied));
    }
  }

  async function run(work: () => Promise<void>) {
    if (activeRequest.current || restoring) return;
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
    if (!text || !consent || !model || !allowed || revision === null) return;
    await run(async () => {
      const history =
        revision !== null
          ? [{ role: "user" as const, content: text }]
          : [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user" as const, content: text },
            ].slice(-11);
      const result = await request(
        "/api/finance/assistant",
        {
          family_id: familyId,
          model,
          share_financial_context: true,
          reference_prior_sessions: referenceLogs && revision !== null,
          ...(context ? { context } : {}),
          messages: history,
          ...(revision !== null ? { conversation_revision: revision } : {}),
        },
        apiKey,
      );
      setMessages((previous) => [
        ...previous,
        { role: "user", content: text },
        {
          role: "assistant",
          content: result.message,
          proposals: result.proposals,
          sources: result.sources,
          coverage: result.coverage,
          fetched_at: result.fetched_at,
          log_references: result.log_references,
        },
      ]);
      setPrompt("");
      if (typeof result.revision === "number") setRevision(result.revision);
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
            {restoring
              ? "Restoring your assistant..."
              : hasSavedKey
                ? "Key saved securely for your account in this workspace."
                : "No personal key saved."}
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
            disabled={busy || restoring || !allowed}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {hasSavedKey
            ? "Leave blank to keep your saved key, or enter a replacement."
            : "Until saved, an entered key lasts only for this visit."}
          {storageReady &&
            !canSaveKey &&
            " Secure key saving requires server configuration."}
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
          disabled={!allowed || busy || restoring}
          onClick={() =>
            void run(async () => {
              const result = await request(
                `/api/finance/models?family_id=${encodeURIComponent(familyId)}`,
                undefined,
                apiKey,
              );
              setModels(result.models);
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
            onChange={(e) => {
              const nextModel = e.target.value;
              setModel(nextModel);
              setConsent(false);
              void run(() => restoreHistory(nextModel));
            }}
            disabled={busy || restoring || !allowed}
          >
            <option value="">Choose a model</option>
            {model && !models.some((m) => m.id === model) && (
              <option value={model}>{model}</option>
            )}
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          className="w-full"
          disabled={
            !allowed ||
            busy ||
            restoring ||
            !model ||
            !storageReady ||
            (!!apiKey && !canSaveKey)
          }
          onClick={() =>
            void run(async () => {
              await request("/api/finance/connection", {
                family_id: familyId,
                model,
                ...(apiKey ? { api_key: apiKey } : {}),
              });
              if (apiKey) {
                setHasSavedKey(true);
                setApiKey("");
              }
              setSavedModel(model);
              if (revision === null) await restoreHistory(model);
              toast({
                title: "Connection saved",
                description:
                  apiKey || hasSavedKey
                    ? "Your model and saved key will be available when you return."
                    : "Your model preference is saved. No personal API key is stored.",
                variant: "success",
              });
            })
          }
        >
          <Save className="h-4 w-4" /> Save connection
        </Button>
        {savedModel && (
          <p className="break-all text-xs text-muted-foreground">
            Saved model: {savedModel}
            {savedModel !== model ? " (selection not saved)" : ""}
          </p>
        )}
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
        <p className="text-xs text-muted-foreground">
          {context
            ? "Reviews use the selected workspace sections. Non-financial records are read-only. "
            : "Account login details, family health, and relationship records are excluded. "}
          Review every proposed financial change before applying it. Payments
          and provider cancellations stay with you.
        </p>
        <Button
          variant="ghost"
          className="w-full"
          disabled={busy || restoring || (!hasSavedKey && !apiKey)}
          onClick={() => setConfirm("key")}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Forget API key
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
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="min-w-0 flex-1 text-base font-semibold sm:text-lg">
            {context
              ? "Your workspace assistant"
              : "Your financial strategy assistant"}
          </h2>
          <Button
            asChild
            variant="ghost"
            size="icon"
            title="Open LLM Log"
            aria-label="Open LLM Log"
          >
            <Link href="/llm-log">
              <NotebookText className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="New session"
            aria-label="New session"
            disabled={
              busy || restoring || revision === null || !messages.length
            }
            onClick={() => setConfirm("new")}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Reload saved conversation"
            aria-label="Reload saved conversation"
            disabled={busy || restoring || !model || !storageReady}
            onClick={() => void run(() => restoreHistory(model))}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Clear this model's conversation"
            aria-label="Clear this model's conversation"
            disabled={busy || restoring || !messages.length}
            onClick={() => setConfirm("history")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {revision !== null
            ? "Saved privately in LLM Log. Up to 100 messages per session; New session keeps the prior transcript. Replies use bounded recent context, not your entire archive."
            : "Session-only conversation."}
        </p>
        {!messages.length && (
          <div className="border-y py-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Start with a question or a specific change.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(context
                ? [
                    "Review the available records and prioritize what needs attention.",
                    "What conflicts, gaps, or overdue obligations can you identify?",
                    "Build a practical strategy for the next 30 days using the available information.",
                    "What information is missing before I can make a decision?",
                  ]
                : [
                    "What needs attention in my recovery plan?",
                    "Compare my subscription costs with my allowance.",
                    "Create a high-priority action to verify every card's autopay this week.",
                    "What information is missing before I can compare payoff strategies?",
                  ]
              ).map((s) => (
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
              {!!m.log_references?.length && (
                <details className="mt-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">
                    Prior sessions referenced ({m.log_references.length})
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {m.log_references.map((ref) => (
                      <li key={ref.id}>
                        <Link
                          className="underline"
                          href={`/llm-log?session=${ref.id}`}
                        >
                          [{ref.ref}] {ref.title}
                        </Link>
                        <span className="ml-2">
                          {ref.matched ? "Keyword match" : "Recent context"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {m.sources && (
                <SourceEvidence
                  sources={m.sources}
                  coverage={m.coverage ?? []}
                  fetchedAt={m.fetched_at}
                  content={m.content}
                />
              )}
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
                    disabled={
                      busy ||
                      applied.has(p.request_id) ||
                      (!!context &&
                        !tablesForContext(context).includes(p.table))
                    }
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
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-primary"
              checked={referenceLogs}
              disabled={busy || restoring || !allowed}
              onChange={(e) => {
                setReferenceLogs(e.target.checked);
                setConsent(false);
              }}
            />
            <span>
              Reference up to three prior sessions with this model and review
              scope. Excluded logs stay out.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-primary"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={busy || restoring || !allowed}
            />
            <span>
              {context
                ? "Share the checked sections, saved conversation, selected prior-session excerpts, and my question with OpenRouter and the selected model provider."
                : "Share this workspace's financial records, my messages, and selected prior-session excerpts with OpenRouter and the selected model provider."}
            </span>
          </label>
          <label htmlFor="finance-prompt" className="sr-only">
            Message the {context ? "workspace" : "finance"} assistant
          </label>
          <Textarea
            id="finance-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={6000}
            placeholder="Ask about your plan, or describe a change..."
            disabled={busy || restoring}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {!consent
                ? "Check the sharing permission above to send. "
                : "Changes require your review. "}
              {revision !== null
                ? "Replies are saved to your account."
                : "Chat is not saved."}
            </span>
            <Button
              type="submit"
              disabled={
                busy ||
                restoring ||
                !allowed ||
                !consent ||
                !model ||
                !prompt.trim() ||
                revision === null
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
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm === "key"
            ? "Forget your saved API key?"
            : confirm === "new"
              ? "Start a new session?"
              : "Clear this model's conversation?"
        }
        description={
          confirm === "key"
            ? "Removes your personal saved key and any key entered here. Conversations and model selection remain. This does not revoke the key at OpenRouter or disable an administrator's shared server connection."
            : confirm === "new"
              ? "Keeps this complete transcript in your private LLM Log and starts an empty conversation with the same model and scope."
              : "Permanently removes this session's saved messages, Markdown log, and pending proposals. Archived sessions and applied changes remain. Download the log first if you need a copy."
        }
        confirmLabel={
          confirm === "key"
            ? "Forget key"
            : confirm === "new"
              ? "New session"
              : "Clear conversation"
        }
        onConfirm={() =>
          run(async () => {
            if (confirm === "key") {
              if (hasSavedKey)
                await request("/api/finance/connection", {
                  family_id: familyId,
                  model: savedModel || model,
                  forget_key: true,
                });
              setHasSavedKey(false);
              setApiKey("");
              setConsent(false);
            } else {
              if (revision !== null) {
                const result = await request("/api/finance/conversation", {
                  family_id: familyId,
                  model,
                  revision,
                  ...(confirm === "new"
                    ? { new_session: true }
                    : { clear: true }),
                  ...(context ? { context } : {}),
                });
                setRevision(result.revision);
              }
              setMessages([]);
              setApplied(new Set());
              setConsent(false);
            }
            toast({
              title:
                confirm === "key"
                  ? "Key forgotten"
                  : confirm === "new"
                    ? "Session archived; new session ready"
                    : "Conversation cleared",
              variant: "success",
            });
          })
        }
      />
    </section>
  );
}
