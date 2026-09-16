"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LockKeyhole, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppData } from "@/components/app/providers";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { FinanceAssistantPanel } from "@/components/finance/assistant-panel";
import {
  assistantContextSchema,
  defaultContext,
  sections,
  sectionKeys,
  sourceCatalog,
  sourceTables,
  sourceTableSchema,
  tablesForContext,
  type AssistantContext,
  type SourceTable,
} from "@/lib/assistant/context";

type Target = { table: SourceTable; id: string };
const AssistantContextUI = createContext<{
  open: (target?: Target) => void;
  allowed: boolean;
} | null>(null);

export function AssistantTrigger({
  table,
  recordId,
}: {
  table?: string;
  recordId?: string;
}) {
  const assistant = useContext(AssistantContextUI);
  const parsedTable = sourceTableSchema.safeParse(table);
  if (!assistant || !assistant.allowed || (table && !parsedTable.success))
    return null;
  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full"
      title={recordId ? "Ask about this record" : "Ask assistant"}
      aria-label={recordId ? "Ask about this record" : "Ask assistant"}
      onClick={() =>
        assistant.open(
          parsedTable.success && recordId
            ? { table: parsedTable.data, id: recordId }
            : undefined,
        )
      }
    >
      <Sparkles className="h-4 w-4" />
    </Button>
  );
}

export function WorkspaceAssistantProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    currentMember,
    currentUser,
    familyId,
    usingLocalData,
    supabaseConfigured,
  } = useAppData();
  const { privacyMode } = usePrivacyMode();
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);
  const [target, setTarget] = useState<Target>();
  const allowed =
    (!usingLocalData || !supabaseConfigured) &&
    !privacyMode &&
    !!currentMember &&
    ["admin", "parent"].includes(currentMember.role);
  return (
    <AssistantContextUI.Provider
      value={{
        allowed,
        open: (next) => {
          setTarget(next);
          setOpened(true);
        },
      }}
    >
      {children}
      <Dialog open={opened && allowed} onOpenChange={setOpened}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl p-4 sm:p-6">
          <DialogHeader className="pr-12">
            <DialogTitle>Workspace assistant</DialogTitle>
            <DialogDescription>
              Review context, sources, and next steps.
            </DialogDescription>
          </DialogHeader>
          {opened && allowed && (
            <WorkspaceAssistant
              key={`${familyId}:${currentUser.id}:${currentMember?.id}:${pathname}:${target?.table}:${target?.id}`}
              page={pathname}
              target={target}
            />
          )}
        </DialogContent>
      </Dialog>
    </AssistantContextUI.Provider>
  );
}

export function WorkspaceAssistant({
  page,
  target,
}: {
  page: string;
  target?: Target;
}) {
  const {
    data,
    familyId,
    currentUser,
    currentMember,
    usingLocalData,
    supabaseConfigured,
  } = useAppData();
  const { privacyMode } = usePrivacyMode();
  const [context, setContext] = useState<AssistantContext>(() =>
    target
      ? {
          ...defaultContext(page),
          mode: "record",
          record: target,
          sections: sections[sourceCatalog[target.table].section].sensitive
            ? []
            : [sourceCatalog[target.table].section],
        }
      : defaultContext(page),
  );
  const [search, setSearch] = useState("");
  const pageTables = tablesForContext({
    mode: "page",
    page,
    sections: sectionKeys,
    search: "",
  });
  const candidateTables =
    context.mode === "workspace"
      ? sourceTables
      : context.mode === "record"
        ? target
          ? [target.table]
          : pageTables
        : pageTables;
  const visibleSections = [
    ...new Set(candidateTables.map((t) => sourceCatalog[t].section)),
  ];
  const parsed = assistantContextSchema.safeParse(context);
  const ready = parsed.success && tablesForContext(parsed.data).length > 0;
  const recordOptions = (context.mode === "record" ? candidateTables : [])
    .filter((t) => context.sections.includes(sourceCatalog[t].section))
    .flatMap((table) =>
      (data[table] ?? [])
        .filter((r) => r.family_id === familyId)
        .map((record) => ({
          table,
          id: record.id,
          title: String(
            (record as unknown as Record<string, unknown>)[
              sourceCatalog[table].title
            ] ?? sourceCatalog[table].label,
          ),
        })),
    );
  if (privacyMode)
    return (
      <p className="py-6 text-sm text-muted-foreground">
        Assistant hidden while privacy mode is on.
      </p>
    );
  if (
    (usingLocalData && supabaseConfigured) ||
    !currentMember ||
    !["admin", "parent"].includes(currentMember.role)
  )
    return (
      <p className="py-6 text-sm text-muted-foreground">
        Sign in as a parent or admin to review saved workspace records.
      </p>
    );

  return (
    <div className="min-w-0 space-y-6">
      <div className="grid gap-3 border-b pb-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2 text-sm font-medium">
          Review scope
          <select
            className="h-11 w-full rounded-lg border bg-background px-3"
            value={context.mode}
            onChange={(e) => {
              const mode = e.target.value as AssistantContext["mode"];
              setContext({
                ...defaultContext(page),
                mode,
                ...(mode === "workspace"
                  ? {
                      sections: sectionKeys.filter(
                        (s) => !sections[s].sensitive,
                      ),
                    }
                  : {}),
                ...(mode === "record" && target ? { record: target } : {}),
              });
              setSearch("");
            }}
          >
            <option value="page">This page</option>
            <option value="record">Selected record</option>
            <option value="workspace">Across workspace</option>
          </select>
        </label>
        {context.mode === "record" ? (
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Record
            <select
              className="h-11 w-full min-w-0 rounded-lg border bg-background px-3"
              value={
                context.record
                  ? `${context.record.table}:${context.record.id}`
                  : ""
              }
              onChange={(e) => {
                const option = recordOptions.find(
                  (r) => `${r.table}:${r.id}` === e.target.value,
                );
                setContext((c) => ({
                  ...c,
                  record: option
                    ? { table: option.table, id: option.id }
                    : undefined,
                }));
              }}
            >
              <option value="">Choose a record</option>
              {recordOptions.map((r) => (
                <option key={`${r.table}:${r.id}`} value={`${r.table}:${r.id}`}>
                  {sourceCatalog[r.table].label}: {r.title}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="space-y-2 text-sm font-medium">
            Title contains
            <span className="flex gap-2">
              <Input
                value={search}
                maxLength={100}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                size="icon"
                variant="outline"
                title="Apply keyword filter"
                aria-label="Apply keyword filter"
                onClick={() =>
                  setContext((c) => ({ ...c, search: search.trim() }))
                }
              >
                <Search className="h-4 w-4" />
              </Button>
            </span>
          </label>
        )}
        <label className="space-y-2 text-sm font-medium">
          From
          <Input
            type="date"
            value={context.from ?? ""}
            onChange={(e) =>
              setContext((c) => ({ ...c, from: e.target.value || undefined }))
            }
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Through
          <Input
            type="date"
            value={context.to ?? ""}
            onChange={(e) =>
              setContext((c) => ({ ...c, to: e.target.value || undefined }))
            }
          />
        </label>
        <fieldset className="col-span-full">
          <legend className="mb-3 text-sm font-medium">
            Included sections
          </legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleSections.map((section) => (
              <label key={section} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-primary"
                  checked={context.sections.includes(section)}
                  onChange={(e) =>
                    setContext((c) => ({
                      ...c,
                      sections: e.target.checked
                        ? [...c.sections, section]
                        : c.sections.filter((s) => s !== section),
                    }))
                  }
                />
                <span>{sections[section].label}</span>
                {sections[section].sensitive && (
                  <LockKeyhole
                    aria-label="Sensitive section"
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  />
                )}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="col-span-full text-xs text-muted-foreground">
          Only checked sections are shared. File contents, external links,
          embedded calendars, credentials, and full account identifiers are
          excluded. Notes receive best-effort secret filtering, not a guarantee;
          do not store secrets in notes. Dates filter each record type&apos;s
          relevant date where available. Changing scope or filters opens a
          separate saved conversation.
        </p>
        {context.search && (
          <p className="col-span-full text-xs">
            Applied keyword: {context.search}
          </p>
        )}
      </div>
      {ready ? (
        <FinanceAssistantPanel
          key={`${familyId}:${currentUser.id}:${currentMember.id}:${JSON.stringify(parsed.data)}`}
          context={parsed.data}
        />
      ) : (
        <p role="status" className="py-6 text-sm text-muted-foreground">
          {!parsed.success &&
          context.from &&
          context.to &&
          context.from > context.to
            ? "Start date must precede end date."
            : "Include a section and choose a record where applicable. Use Across workspace for a broader review."}
        </p>
      )}
    </div>
  );
}
