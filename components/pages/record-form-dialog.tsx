"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/app/file-uploader";
import { useAppData } from "@/components/app/providers";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useToast } from "@/hooks/use-toast";
import type { FieldConfig, ModuleConfig } from "@/lib/modules";
import type { AnyRecord } from "@/lib/types";
import { weekdayLabels } from "@/lib/options";
import { cn, nowIso, recordMap, titleCase } from "@/lib/utils";

interface RecordFormDialogProps {
  config: ModuleConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: AnyRecord | null;
  defaultOverrides?: Record<string, unknown>;
}

type FormShape = Record<string, unknown>;

function formatInputValue(value: unknown, field: FieldConfig) {
  if (value === null || value === undefined) return field.type === "checkbox" ? false : "";
  if (field.type === "tags" && Array.isArray(value)) return value.join(", ");
  if (field.type === "lines" && Array.isArray(value)) return value.join("\n");
  if (field.type === "weekdays") return Array.isArray(value) ? value : [];
  if ((field.type === "date" || field.type === "datetime") && typeof value === "string" && value) {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return field.type === "date" ? format(parsed, "yyyy-MM-dd") : format(parsed, "yyyy-MM-dd'T'HH:mm");
  }
  return value;
}

function buildDefaultValues(config: ModuleConfig, record?: AnyRecord | null, overrides?: Record<string, unknown>) {
  const source = record ? { ...record } : { ...config.defaultValues, ...overrides };
  const defaults: FormShape = {};

  for (const field of config.fields) {
    defaults[field.name] = formatInputValue(recordMap(source)[field.name], field);
  }

  return defaults;
}

function normalizePayload(config: ModuleConfig, values: FormShape, currentMemberId: string | null, record?: AnyRecord | null) {
  const payload: Record<string, unknown> = { ...values };

  for (const field of config.fields) {
    const value = payload[field.name];
    if (field.type === "datetime" && typeof value === "string" && value) {
      payload[field.name] = new Date(value).toISOString();
    }
    if ((field.type === "number" || field.type === "currency") && value !== null && value !== undefined && value !== "") {
      payload[field.name] = Number(value);
    }
    if (field.type === "checkbox") {
      payload[field.name] = Boolean(value);
    }
  }

  if (config.table === "events" && !record) payload.created_by = currentMemberId;
  if (config.table === "tasks") {
    if (!record) payload.created_by = currentMemberId;
    payload.completed_at = payload.status === "done" ? (record ? (recordMap(record).completed_at ?? nowIso()) : nowIso()) : null;
  }
  if (config.table === "grocery_items" && !record) payload.added_by = currentMemberId;
  if (config.table === "financial_transactions" && !record) payload.created_by = currentMemberId;
  if (config.table === "communication_notes") {
    if (!record) payload.created_by = currentMemberId;
    payload.acknowledged_by = record ? (recordMap(record).acknowledged_by ?? []) : [];
  }
  if (config.table === "relationship_records") {
    if (!record) payload.created_by = currentMemberId;
    payload.completed_at = payload.status === "done" ? (record ? (recordMap(record).completed_at ?? nowIso()) : nowIso()) : null;
  }
  if (config.table === "activity_ideas" && !record) payload.created_by = currentMemberId;
  if (config.table === "chores" && !record) payload.created_by = currentMemberId;
  if (config.table === "shared_lists" && !record) payload.created_by = currentMemberId;
  if (config.table === "journal_entries" && !record && !payload.author_id) payload.author_id = currentMemberId;
  if (config.table === "checkins" && !record && !payload.member_id) payload.member_id = currentMemberId;

  return payload;
}

export function RecordFormDialog({ config, open, onOpenChange, record, defaultOverrides }: RecordFormDialogProps) {
  const { createRecord, updateRecord, currentMemberId } = useAppData();
  const { members } = useFamilyMembers();
  const { toast } = useToast();
  const defaultValues = useMemo(() => buildDefaultValues(config, record, defaultOverrides), [config, defaultOverrides, record]);
  const form = useForm<FormShape>({
    resolver: zodResolver(config.schema),
    defaultValues
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [defaultValues, form, open]);

  async function onSubmit(values: FormShape) {
    try {
      const payload = normalizePayload(config, values, currentMemberId, record);
      if (record) {
        await updateRecord(config.table as never, record.id, payload as never);
        toast({ title: "Updated", description: `${config.title} record saved.`, variant: "success" });
      } else {
        await createRecord(config.table as never, payload as never);
        toast({ title: "Created", description: `${config.addLabel.replace("Add ", "")} added.`, variant: "success" });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Could not save",
        description: error instanceof Error ? error.message : "Check the form and try again.",
        variant: "destructive"
      });
    }
  }

  function renderField(field: FieldConfig) {
    const error = form.formState.errors[field.name]?.message;
    const label = (
      <label htmlFor={field.name} className="flex items-center gap-2 text-sm font-medium">
        {field.label}
        {field.required ? <span className="text-destructive">*</span> : null}
        {field.sensitive ? <ShieldAlert className="h-3.5 w-3.5 text-amber-600" aria-label="Sensitive field" /> : null}
      </label>
    );

    const input = (() => {
      if (field.type === "textarea" || field.type === "lines") {
        return <Textarea id={field.name} rows={field.type === "lines" ? 5 : undefined} {...form.register(field.name)} placeholder={field.placeholder} />;
      }

      if (field.type === "weekdays") {
        return (
          <Controller
            control={form.control}
            name={field.name}
            render={({ field: controllerField }) => {
              const selected: number[] = Array.isArray(controllerField.value) ? (controllerField.value as number[]) : [];
              return (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={field.label}>
                  {weekdayLabels.map((label, index) => {
                    const active = selected.includes(index);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          controllerField.onChange(active ? selected.filter((day) => day !== index) : [...selected, index].sort((a, b) => a - b))
                        }
                        className={cn(
                          "h-9 min-w-11 rounded-full border px-3 text-xs font-semibold transition-all focus-ring",
                          active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-white/70 text-muted-foreground hover:border-primary/40 dark:bg-white/5"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              );
            }}
          />
        );
      }

      if (field.type === "emoji") {
        return (
          <Controller
            control={form.control}
            name={field.name}
            render={({ field: controllerField }) => (
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={field.label}>
                {(field.options ?? []).map((emoji) => {
                  const active = controllerField.value === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={emoji}
                      onClick={() => controllerField.onChange(emoji)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition-all focus-ring",
                        active ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30" : "border-border bg-white/70 hover:border-primary/40 dark:bg-white/5"
                      )}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            )}
          />
        );
      }

      if (field.type === "checkbox") {
        return (
          <Controller
            control={form.control}
            name={field.name}
            render={({ field: controllerField }) => (
              <label className="record-tile flex min-h-10 items-center gap-3 px-3 py-2 text-sm">
                <Checkbox checked={Boolean(controllerField.value)} onCheckedChange={(checked) => controllerField.onChange(Boolean(checked))} />
                {field.label}
              </label>
            )}
          />
        );
      }

      if (field.type === "select" || field.type === "person") {
        const options =
          field.type === "person"
            ? members.map((member) => ({ label: member.display_name, value: member.id }))
            : (field.options ?? []).map((option) => ({ label: titleCase(option), value: option }));

        return (
          <Controller
            control={form.control}
            name={field.name}
            render={({ field: controllerField }) => (
              <Select
                value={controllerField.value ? String(controllerField.value) : "__none"}
                onValueChange={(value) => controllerField.onChange(value === "__none" ? "" : value)}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {!field.required ? <SelectItem value="__none">None</SelectItem> : null}
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        );
      }

      if (field.type === "file") {
        return (
          <Controller
            control={form.control}
            name={field.name}
            render={({ field: controllerField }) => (
              <FileUploader label={field.label} value={String(controllerField.value ?? "")} onChange={controllerField.onChange} />
            )}
          />
        );
      }

      const inputType =
        field.type === "date"
          ? "date"
          : field.type === "datetime"
            ? "datetime-local"
            : field.type === "currency" || field.type === "number"
              ? "number"
              : field.type === "url"
                ? "url"
                : "text";

      return (
        <Input
          id={field.name}
          type={inputType}
          step={field.type === "currency" ? "0.01" : undefined}
          placeholder={field.placeholder}
          {...form.register(field.name)}
        />
      );
    })();

    if (field.type === "checkbox") {
      return (
        <div key={field.name} className={field.fullWidth ? "sm:col-span-2" : undefined}>
          {input}
          {field.helper ? <p className="mt-1 text-xs text-muted-foreground">{field.helper}</p> : null}
          {typeof error === "string" ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        </div>
      );
    }

    return (
      <div key={field.name} className={field.fullWidth ? "sm:col-span-2" : undefined}>
        {label}
        <div className="mt-2">{input}</div>
        {field.helper ? <p className="mt-1 text-xs text-muted-foreground">{field.helper}</p> : null}
        {typeof error === "string" ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{record ? `Edit ${config.addLabel.replace("Add ", "")}` : config.addLabel}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        {config.helpText ? (
          <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{config.helpText}</p>
          </div>
        ) : null}
        <form className="grid-auto-fit-sm" onSubmit={form.handleSubmit(onSubmit)}>
          {config.fields.map(renderField)}
          <DialogFooter className="col-span-full">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{record ? "Save Changes" : config.addLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
