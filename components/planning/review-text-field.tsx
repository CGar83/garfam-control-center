"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ReviewTextFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onSave: (value: string) => Promise<void>;
}

/** Text field that keeps a local draft and persists on blur. */
export function ReviewTextField({ id, label, value, placeholder, multiline = true, onSave }: ReviewTextFieldProps) {
  const [draft, setDraft] = useState(value);
  const [savedFlash, setSavedFlash] = useState(false);
  const focused = useRef(false);
  const lastSaved = useRef(value);

  useEffect(() => {
    // Keep the draft in sync with remote updates while the user is not typing.
    if (!focused.current && value !== lastSaved.current) {
      lastSaved.current = value;
      setDraft(value);
    }
  }, [value]);

  async function commit() {
    focused.current = false;
    const next = draft.trim();
    if (next === (lastSaved.current ?? "").trim()) return;
    lastSaved.current = next;
    await onSave(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
  }

  const shared = {
    id,
    value: draft,
    placeholder,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => void commit()
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className={cn("inline-flex items-center gap-1 text-xs text-emerald-600 transition-opacity dark:text-emerald-400", savedFlash ? "opacity-100" : "opacity-0")} aria-live="polite">
          <Check className="h-3 w-3" /> Saved
        </span>
      </div>
      {multiline ? (
        <Textarea {...shared} rows={3} className="min-h-20" onChange={(event) => setDraft(event.target.value)} />
      ) : (
        <Input {...shared} onChange={(event) => setDraft(event.target.value)} />
      )}
    </div>
  );
}
