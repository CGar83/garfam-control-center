"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/components/app/providers";
import { useToast } from "@/hooks/use-toast";
import {
  existingImportRecord,
  importIdentity,
  parseRecoveryHtml,
  parseRecoveryWorkbook,
  type ImportCandidate,
  type SheetRows,
} from "@/lib/finance/import";
import { titleCase } from "@/lib/utils";

export function FinanceImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, familyId, createRecord, currentMember } = useAppData();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    setCandidates([]);
    setSelected(new Set());
    setSaved(new Set());
    try {
      const next: ImportCandidate[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024)
          throw new Error("Use files smaller than 5 MB.");
        if (/\.xlsx$/i.test(file.name)) {
          const { default: read, readSheetNames } = await import(
            "read-excel-file"
          );
          const names = await readSheetNames(file);
          const sheets: SheetRows = {};
          for (const name of [
            "Recovery Hub",
            "Recovery Subscriptions",
            "Asset Register",
            "Credit Cards",
          ]) {
            if (names.includes(name))
              // Empty cached formula strings exist in the supplied workbook.
              // Trim source strings in our parser after the XLSX reader handles them.
              sheets[name] = await read(file, { sheet: name, trim: false });
          }
          next.push(...parseRecoveryWorkbook(sheets));
        } else if (/\.html?$/i.test(file.name))
          next.push(...parseRecoveryHtml(await file.text()));
        else
          throw new Error(
            "Choose the recovery .xlsx workbook or .html dashboard.",
          );
      }
      if (!next.length)
        throw new Error("No supported financial records were found.");
      setCandidates(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!currentMember || !["admin", "parent"].includes(currentMember.role))
      return;
    setBusy(true);
    setError("");
    let count = 0;
    try {
      for (const index of selected) {
        const item = candidates[index];
        if (saved.has(index) || existingImportRecord(item, data, familyId))
          continue;
        await createRecord(item.table, item.values);
        setSaved((previous) => new Set([...previous, index]));
        count++;
      }
      setSelected(new Set());
      toast({
        title: `${count} financial records imported`,
        description: "Review current balances and complete missing values.",
        variant: "success",
      });
    } catch (e) {
      setError(
        `${count} records saved. Import stopped: ${e instanceof Error ? e.message : "Check the database migration and try again."} Saved rows will not be imported again.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import your recovery files</DialogTitle>
          <DialogDescription>
            Choose the workbook, HTML dashboard, or both. Review the source
            values before adding records. Existing records are preserved.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.html,.htm"
          multiple
          className="sr-only"
          aria-label="Recovery files"
          onChange={(e) => void load(e.target.files)}
        />
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {busy ? "Processing..." : "Choose files"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Files are read on this device. Only selected records are saved to the
          current workspace. Recommendations are imported as notes, not
          completed actions. The workbook&apos;s example transactions, bills,
          and sinking funds are excluded.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="max-h-[45vh] space-y-2 overflow-y-auto">
          {candidates.map((item, index) => {
            const identity = importIdentity(item.table, item.values);
            const existing = existingImportRecord(item, data, familyId);
            const alternatives =
              candidates.filter(
                (c) => importIdentity(c.table, c.values) === identity,
              ).length > 1;
            const disabled = busy || saved.has(index) || Boolean(existing);
            return (
              <div key={index} className="rounded-lg border p-3">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-primary"
                    disabled={disabled}
                    checked={selected.has(index)}
                    onChange={(e) =>
                      setSelected((previous) => {
                        const next = new Set(
                          [...previous].filter(
                            (i) =>
                              importIdentity(
                                candidates[i].table,
                                candidates[i].values,
                              ) !== identity,
                          ),
                        );
                        if (e.target.checked) next.add(index);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0">
                    <span className="block font-medium break-words">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.source}
                      {saved.has(index)
                        ? " · Saved"
                        : existing
                          ? " · Already exists: edit the existing record to update it"
                          : alternatives
                            ? " · Alternative source: select only one"
                            : ""}
                    </span>
                  </span>
                </label>
                <details className="ml-8 mt-2 text-xs">
                  <summary className="cursor-pointer text-primary">
                    Review values
                    {item.warnings.length ? " and source notes" : ""}
                  </summary>
                  {item.warnings.map((w) => (
                    <p
                      key={w}
                      className="my-2 text-amber-800 dark:text-amber-200"
                    >
                      {w}
                    </p>
                  ))}
                  <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-3 gap-y-1">
                    {Object.entries(item.values).map(([key, val]) => (
                      <div key={key} className="contents">
                        <dt className="text-muted-foreground">
                          {titleCase(key)}
                        </dt>
                        <dd className="break-words">
                          {val === null || val === ""
                            ? "Not supplied"
                            : String(val)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </div>
            );
          })}
        </div>
        {candidates.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <span className="text-sm text-muted-foreground">
              {selected.size} selected of {candidates.length} source records
            </span>
            <Button
              disabled={busy || selected.size === 0}
              onClick={() => void save()}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import selected
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
