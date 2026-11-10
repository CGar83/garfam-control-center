"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { useAppData } from "./providers";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { moduleConfigs, type ModuleConfig } from "@/lib/modules";
import { getRecordTitle, recordDestination } from "@/lib/filtering";
import { memberCanAccessPath } from "@/lib/access-control";
import { formatDate, formatDateTime, recordMap, titleCase } from "@/lib/utils";
import type { AnyRecord, TableName } from "@/lib/types";

function Details() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data, familyId, currentMember, loading } = useAppData();
  const { privacyMode } = usePrivacyMode();
  const [editingId, setEditingId] = useState<string | null>(null);
  const id = params.get("record");
  const table = params.get("table");
  if (!id) return null;
  if (!table && ["/calendar", "/finances"].includes(pathname)) return null;
  const candidates = (Object.keys(data) as TableName[]).filter(key => recordDestination(key) === pathname && (!table || key === table));
  const match = candidates.flatMap(key => data[key].filter(row => row.id === id && "family_id" in row && row.family_id === familyId).map(record => ({ table: key, record: record as AnyRecord })))[0];
  const allowed = memberCanAccessPath(currentMember, pathname);
  const canEdit = Boolean(currentMember && ["admin", "parent"].includes(currentMember.role));
  const config = match ? (Object.values(moduleConfigs) as ModuleConfig[]).find(item => item.table === match.table && item.route === pathname) : undefined;
  function close() {
    const next = new URLSearchParams(params.toString());
    next.delete("record"); next.delete("table");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  if (editingId === id && match && config && allowed && canEdit && !privacyMode) return <RecordFormDialog config={config} record={match.record} open onOpenChange={open => { if (!open) setEditingId(null); }} />;
  const fields = config?.fields ?? [{ name: "name", label: "Name" }, { name: "checked", label: "Checked" }, { name: "quantity", label: "Quantity" }, { name: "note", label: "Note" }, { name: "assigned_to", label: "Assigned person" }];
  function value(name: string) {
    const raw = match && recordMap(match.record)[name];
    if (raw == null || raw === "") return "Not added";
    const field = config?.fields.find(item => item.name === name);
    if (field?.type === "date") return formatDate(String(raw));
    if (field?.type === "datetime") return formatDateTime(String(raw));
    if (field?.type === "select") return titleCase(String(raw));
    if (/last_four|last_six/.test(name)) return `•••• ${String(raw)}`;
    if (typeof raw === "boolean") return raw ? "Yes" : "No";
    if (Array.isArray(raw)) return raw.map(item => typeof item === "string" ? (data.family_members.find(member => member.id === item)?.display_name ?? item) : JSON.stringify(item)).join(", ") || "None";
    return data.family_members.find(member => member.id === raw)?.display_name ?? (typeof raw === "object" ? JSON.stringify(raw) : String(raw));
  }
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent>
    <DialogHeader><DialogTitle className="break-words pr-12">{!privacyMode && allowed && match ? getRecordTitle(match.record) : "Record details"}</DialogTitle><DialogDescription>{config?.title ?? titleCase(pathname.slice(1))}</DialogDescription></DialogHeader>
    {loading ? <p role="status">Loading record...</p> : !allowed ? <p>This record is unavailable for this profile.</p> : privacyMode ? <p>Record details are hidden in privacy mode.</p> : !match ? <p role="status">This record is no longer available in this workspace.</p> : <>
      <dl className="grid min-w-0 gap-4 sm:grid-cols-2">{fields.map(field => <div key={field.name} className="min-w-0"><dt className="text-xs text-muted-foreground">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value(field.name)}</dd></div>)}</dl>
      {config && canEdit && <Button onClick={() => setEditingId(id)}>Edit record</Button>}
    </>}
    <Button variant="outline" onClick={close}>Back to page</Button>
  </DialogContent></Dialog>;
}

export function RecordDetails() {
  return <Suspense fallback={null}><Details /></Suspense>;
}
