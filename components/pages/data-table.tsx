"use client";

import { useState } from "react";
import { ExternalLink, Pencil, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { DateBadge } from "@/components/app/date-badge";
import { PersonAvatar } from "@/components/app/person-avatar";
import { PriorityBadge } from "@/components/app/priority-badge";
import { PrivacyMask } from "@/components/app/privacy-mask";
import { StatusBadge } from "@/components/app/status-badge";
import { useAppData } from "@/components/app/providers";
import { useToast } from "@/hooks/use-toast";
import type { ModuleConfig } from "@/lib/modules";
import type { AnyRecord } from "@/lib/types";
import { formatDateTime, recordMap, safeNumber, titleCase } from "@/lib/utils";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";

interface DataTableProps {
  config: ModuleConfig;
  records: AnyRecord[];
}

const personColumns = new Set(["assigned_to", "person_id", "child_id", "visible_to", "created_by", "added_by"]);
const dateColumns = new Set([
  "start_at",
  "end_at",
  "due_at",
  "due_date",
  "needed_by",
  "meal_date",
  "appointment_date",
  "maintenance_due",
  "warranty_expiration",
  "registration_due",
  "renewal_date",
  "target_date",
  "related_date",
  "last_synced_at"
]);

function fieldValue(record: AnyRecord, column: string) {
  return recordMap(record)[column];
}

function renderCell(record: AnyRecord, column: string, config: ModuleConfig) {
  const value = fieldValue(record, column);
  const stringValue = value === null || value === undefined || value === "" ? "" : String(value);
  const sensitive = config.privacyFields?.includes(column) ?? false;

  if (!stringValue && typeof value !== "boolean" && typeof value !== "number") return <span className="text-muted-foreground">—</span>;

  if (personColumns.has(column)) return <PersonAvatar personId={stringValue} />;
  if (column === "status") return <StatusBadge status={stringValue} />;
  if (column === "priority" || column === "importance") return <PriorityBadge priority={stringValue} />;
  if (dateColumns.has(column)) return column.includes("_at") ? formatDateTime(stringValue) : <DateBadge value={stringValue} />;

  if (column === "amount") {
    return Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(safeNumber(value));
  }

  if (column === "progress") {
    const progress = Math.min(100, Math.max(0, safeNumber(value)));
    return (
      <div className="min-w-32">
        <div className="h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="mt-1 block text-xs text-muted-foreground">{progress}%</span>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return <Badge variant={value ? "success" : "outline"}>{value ? "Yes" : "No"}</Badge>;
  }

  if (column === "website_url" || column === "file_url") {
    return (
      <PrivacyMask value={stringValue} sensitive={sensitive}>
        <a className="inline-flex items-center gap-1 text-primary hover:underline" href={stringValue} target="_blank" rel="noreferrer">
          Open <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </PrivacyMask>
    );
  }

  if (column === "phone" || column === "contact_phone" || column === "provider_phone" || column === "support_phone" || column === "vendor_phone") {
    return (
      <PrivacyMask value={stringValue} sensitive={sensitive}>
        <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`tel:${stringValue}`}>
          <Phone className="h-3.5 w-3.5" />
          {stringValue}
        </a>
      </PrivacyMask>
    );
  }

  if (column.includes("last_four")) {
    return (
      <PrivacyMask value={stringValue} sensitive visibleChars={4}>
        <span>•••• {stringValue}</span>
      </PrivacyMask>
    );
  }

  return (
    <PrivacyMask value={stringValue} sensitive={sensitive}>
      <span className="line-clamp-2">{Array.isArray(value) ? value.join(", ") : stringValue}</span>
    </PrivacyMask>
  );
}

export function DataTable({ config, records }: DataTableProps) {
  const { deleteRecord } = useAppData();
  const { toast } = useToast();
  const [editing, setEditing] = useState<AnyRecord | null>(null);
  const [deleting, setDeleting] = useState<AnyRecord | null>(null);

  return (
    <>
      <div className="rounded-lg border bg-white/75 shadow-[var(--shadow-subtle)] backdrop-blur-xl dark:bg-card/80">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.map((column) => (
                <TableHead key={column}>{titleCase(column)}</TableHead>
              ))}
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                {config.columns.map((column) => (
                  <TableCell key={column}>{renderCell(record, column, config)}</TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(record)} title="Edit record">
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(record)} title="Delete record">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <RecordFormDialog config={config} open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} record={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this record?"
        description="This removes the record from the family workspace. This action cannot be undone."
        onConfirm={async () => {
          if (!deleting) return;
          await deleteRecord(config.table as never, deleting.id);
          toast({ title: "Deleted", description: "The record was removed.", variant: "success" });
          setDeleting(null);
        }}
      />
    </>
  );
}
