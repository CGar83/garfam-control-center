"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Download,
  LoaderCircle,
  NotebookText,
  RefreshCw,
  Save,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAppData } from "@/components/app/providers";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import {
  logFilename,
  logUpdateSchema,
  type LlmLogDetail,
  type LlmLogSummary,
} from "@/lib/assistant/logs";

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

function LogBrowser() {
  const { familyId, supabase } = useAppData();
  const { toast } = useToast();
  const params = useSearchParams();
  const linkedSession = params.get("session");
  const [logs, setLogs] = useState<LlmLogSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(
    linkedSession,
  );
  const [detail, setDetail] = useState<LlmLogDetail | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setSelected(linkedSession);
  }, [linkedSession]);

  const request = useCallback(
    async (url: string, init?: RequestInit) => {
      const session = await supabase?.auth.getSession();
      if (!session?.data.session)
        throw new Error("Sign in to read your private logs.");
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: {
          ...init?.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "The log request failed.");
      }
      return response;
    },
    [supabase],
  );
  const base = `/api/assistant/logs?family_id=${encodeURIComponent(familyId)}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void request(`${base}&page=${page}&search=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setLogs(data.logs);
          setTotal(data.total);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [base, page, query, refresh, request]);
  useEffect(() => {
    let active = true;
    setDetail(null);
    if (!selected) {
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    setError("");
    void request(`${base}&id=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setDetail(data.log);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [base, selected, refresh, request]);

  async function perform(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!detail) return;
    const response = await request(`${base}&id=${detail.id}&download=1`);
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = logFilename(detail.id);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">LLM Log</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your private conversations and reference notes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/finances">Finance Hub</Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Refresh logs"
            aria-label="Refresh logs"
            disabled={loading || busy}
            onClick={() => setRefresh((n) => n + 1)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <form
        className="flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
          setPage(0);
        }}
      >
        <Input
          aria-label="Search transcripts"
          placeholder="Search transcripts"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          size="icon"
          variant="outline"
          type="submit"
          title="Search logs"
          aria-label="Search logs"
        >
          <Search className="h-4 w-4" />
        </Button>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:border-r lg:pr-6">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span>{total} sessions</span>
            {loading && (
              <LoaderCircle
                aria-label="Loading logs"
                className="h-4 w-4 animate-spin"
              />
            )}
          </div>
          {!loading && !logs.length && (
            <div className="border-y py-8 text-sm text-muted-foreground">
              <NotebookText className="mb-3 h-6 w-6" />
              <p>No saved sessions found.</p>
              <p className="mt-2">
                Completed replies are logged automatically. Previously deleted
                chats cannot be recovered.
              </p>
            </div>
          )}
          <ul className="max-h-80 divide-y overflow-y-auto lg:max-h-[65vh]">
            {logs.map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  disabled={busy}
                  className={`w-full rounded-lg px-3 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected === log.id ? "bg-accent/50" : "hover:bg-muted/50"}`}
                  onClick={() => setSelected(log.id)}
                  aria-current={selected === log.id ? "true" : undefined}
                >
                  <span className="block break-words text-sm font-medium">
                    {log.title}
                  </span>
                  <span className="mt-1 block break-all text-xs text-muted-foreground">
                    {log.model}
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {log.message_count} messages ·{" "}
                    {log.ended_at ? "Archived" : "Current"} ·{" "}
                    {log.reference_enabled ? "Reference on" : "Excluded"}
                  </span>
                  <time className="mt-1 block text-xs text-muted-foreground">
                    {displayDate(log.updated_at)}
                  </time>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous page"
              title="Previous page"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next page"
              title="Next page"
              disabled={(page + 1) * 25 >= total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </aside>
        <div className="min-w-0">
          {detailLoading ? (
            <p role="status" className="py-8 text-sm">
              Loading transcript...
            </p>
          ) : !detail ? (
            <p className="py-8 text-sm text-muted-foreground">
              Select a session.
            </p>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-semibold">
                    {detail.title}
                  </h2>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {logFilename(detail.id)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    title="Download Markdown"
                    aria-label="Download Markdown"
                    disabled={busy}
                    onClick={() => void perform(download)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Delete session"
                    aria-label="Delete session"
                    disabled={busy}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <form
                className="space-y-4 border-y py-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void perform(async () => {
                    const input = logUpdateSchema.parse({
                      family_id: familyId,
                      id: detail.id,
                      title: detail.title,
                      memory_note: detail.memory_note,
                      reference_enabled: detail.reference_enabled,
                      updated_at: detail.updated_at,
                    });
                    const result = await (
                      await request("/api/assistant/logs", {
                        method: "PATCH",
                        body: JSON.stringify(input),
                      })
                    ).json();
                    setDetail((d) =>
                      d?.id === detail.id ? { ...d, updated_at: result.updated_at } : d,
                    );
                    setLogs((rows) =>
                      rows.map((row) =>
                        row.id === detail.id
                          ? {
                              ...row,
                              title: detail.title,
                              reference_enabled: detail.reference_enabled,
                              updated_at: result.updated_at,
                            }
                          : row,
                      ),
                    );
                    toast({ title: "Log settings saved", variant: "success" });
                  });
                }}
              >
                <label className="block space-y-2 text-sm">
                  Session title
                  <Input
                    required
                    maxLength={200}
                    value={detail.title}
                    onChange={(e) =>
                      setDetail({ ...detail, title: e.target.value })
                    }
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  Reference note
                  <Textarea
                    rows={3}
                    maxLength={2000}
                    value={detail.memory_note}
                    onChange={(e) =>
                      setDetail({ ...detail, memory_note: e.target.value })
                    }
                    placeholder="Decisions, corrections, or unresolved questions"
                  />
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    className="mt-1 h-5 w-5 shrink-0 accent-primary"
                    type="checkbox"
                    checked={detail.reference_enabled}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        reference_enabled: e.target.checked,
                      })
                    }
                  />
                  <span>Allow this session as a future reference</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Only your archived sessions with the same model and review
                  scope qualify. Exclusion stops future retrieval; it does not
                  erase excerpts already saved in later conversations. Never put
                  passwords or full account numbers in a reference note.
                </p>
                <Button disabled={busy} type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save settings
                </Button>
              </form>
              <details open className="mt-5">
                <summary className="cursor-pointer text-sm font-medium">
                  Markdown transcript
                </summary>
                <pre className="mt-4 max-h-[65vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-4 font-mono text-xs leading-6">
                  {detail.transcript_md.slice(0, 250000)}
                </pre>
                {detail.transcript_md.length > 250000 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Preview shortened. The Markdown download contains the
                    complete saved transcript.
                  </p>
                )}
              </details>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this session?"
        description="Permanently deletes this log and its active conversation, if any. Download the Markdown first if needed. Excerpts already saved in other sessions and backup retention are separate."
        confirmLabel="Delete session"
        onConfirm={() =>
          perform(async () => {
            if (!detail) return;
            await request("/api/assistant/logs", {
              method: "DELETE",
              body: JSON.stringify({ family_id: familyId, id: detail.id }),
            });
            setSelected(null);
            setDetail(null);
            setRefresh((n) => n + 1);
            toast({ title: "Session deleted", variant: "success" });
          })
        }
      />
    </section>
  );
}

export default function LlmLogPage() {
  const { familyId, currentUser, currentMember, usingLocalData } = useAppData();
  const { privacyMode } = usePrivacyMode();
  if (privacyMode)
    return (
      <p className="py-8 text-sm text-muted-foreground">
        LLM Log is hidden in privacy mode.
      </p>
    );
  if (
    usingLocalData ||
    !currentMember ||
    !["admin", "parent"].includes(currentMember.role)
  )
    return (
      <p className="py-8 text-sm text-muted-foreground">
        Sign in as a parent or admin to access your private LLM Log.
      </p>
    );
  return (
    <Suspense fallback={<p role="status">Loading logs...</p>}>
      <LogBrowser key={`${familyId}:${currentUser.id}:${currentMember.id}`} />
    </Suspense>
  );
}
