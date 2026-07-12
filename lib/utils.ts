import { clsx, type ClassValue } from "clsx";
import { format, isAfter, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import { twMerge } from "tailwind-merge";
import type { Priority, TaskStatus } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function makeId(prefix = "rec") {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}_${random}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function parseMaybeDate(value?: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function formatDate(value?: string | null, fallback = "No date") {
  const parsed = parseMaybeDate(value);
  return parsed ? format(parsed, "MMM d, yyyy") : fallback;
}

export function formatDateTime(value?: string | null, fallback = "No date") {
  const parsed = parseMaybeDate(value);
  return parsed ? format(parsed, "MMM d, h:mm a") : fallback;
}

export function isOverdue(value?: string | null) {
  const parsed = parseMaybeDate(value);
  if (!parsed) return false;
  return isBefore(startOfDay(parsed), startOfDay(new Date()));
}

export function isDueSoon(value?: string | null, days = 7) {
  const parsed = parseMaybeDate(value);
  if (!parsed) return false;
  const today = startOfDay(new Date());
  const future = new Date(today);
  future.setDate(today.getDate() + days);
  return (isAfter(parsed, today) || parsed.toDateString() === today.toDateString()) && isBefore(parsed, future);
}

export function priorityLabel(priority?: Priority | string | null) {
  const labels: Record<Priority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent"
  };

  return priority && priority in labels ? labels[priority as Priority] : "Normal";
}

export function taskStatusLabel(status?: TaskStatus | string | null) {
  const labels: Record<TaskStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    waiting: "Waiting",
    done: "Done"
  };

  return status && status in labels ? labels[status as TaskStatus] : "Open";
}

export function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
}

export function maskValue(value?: string | number | null, visible = 0) {
  if (value === null || value === undefined || value === "") return "Hidden";
  const text = String(value);
  const suffix = visible > 0 ? text.slice(-visible) : "";
  return `${"•".repeat(Math.max(4, text.length - visible))}${suffix}`;
}

export function containsUnsafeSecret(value?: string | null) {
  if (!value) return false;
  const text = value.toLowerCase();
  const labeledSecret = /(password|passwd|pwd|ssn|social security|account number|routing number)\s*[:=]\s*\S+/i.test(
    value
  );
  const ssnLike = /\b\d{3}-\d{2}-\d{4}\b/.test(value);
  const longAccountLike = /\b\d{9,}\b/.test(value);
  const explicitFull = text.includes("full password") || text.includes("full ssn");

  return labeledSecret || ssnLike || longAccountLike || explicitFull;
}

export function safeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function recordMap(record: unknown): Record<string, unknown> {
  return record as Record<string, unknown>;
}
