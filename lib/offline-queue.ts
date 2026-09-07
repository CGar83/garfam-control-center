import { makeId, nowIso, recordMap } from "@/lib/utils";

export type OfflineMutationAction = "create" | "update" | "delete";

export interface OfflineMutation {
  id: string;
  family_id: string;
  table: string;
  action: OfflineMutationAction;
  record_id: string;
  record?: Record<string, unknown>;
  values?: Record<string, unknown>;
  created_at: string;
  attempts: number;
  last_error?: string | null;
}

export function isOfflineMutation(value: unknown): value is OfflineMutation {
  if (!value || typeof value !== "object") return false;
  const record = recordMap(value);
  return (
    typeof record.id === "string" &&
    typeof record.family_id === "string" &&
    typeof record.table === "string" &&
    (record.action === "create" || record.action === "update" || record.action === "delete") &&
    typeof record.record_id === "string" &&
    typeof record.created_at === "string" &&
    typeof record.attempts === "number"
  );
}

export function parseOfflineQueue(raw: string | null): OfflineMutation[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isOfflineMutation) : [];
  } catch {
    return [];
  }
}

export function serializeOfflineQueue(queue: OfflineMutation[]) {
  return JSON.stringify(queue);
}

export function createOfflineMutation(input: {
  familyId: string;
  table: string;
  action: OfflineMutationAction;
  recordId: string;
  record?: Record<string, unknown>;
  values?: Record<string, unknown>;
  createdAt?: string;
}): OfflineMutation {
  return {
    id: makeId("offline"),
    family_id: input.familyId,
    table: input.table,
    action: input.action,
    record_id: input.recordId,
    record: input.record,
    values: input.values,
    created_at: input.createdAt ?? nowIso(),
    attempts: 0,
    last_error: null
  };
}

function sameRecord(left: OfflineMutation, right: OfflineMutation) {
  return left.family_id === right.family_id && left.table === right.table && left.record_id === right.record_id;
}

export function mergeOfflineMutation(queue: OfflineMutation[], next: OfflineMutation): OfflineMutation[] {
  const createIndex = queue.findIndex((mutation) => sameRecord(mutation, next) && mutation.action === "create");
  const createMutationId = createIndex >= 0 ? queue[createIndex]?.id : null;

  if (createIndex >= 0 && next.action === "update") {
    return queue
      .filter((mutation) => !(sameRecord(mutation, next) && mutation.action === "update"))
      .map((mutation) =>
        mutation.id === createMutationId
          ? {
              ...mutation,
              record: { ...(mutation.record ?? {}), ...(next.values ?? {}) },
              values: { ...(mutation.values ?? {}), ...(next.values ?? {}) }
            }
          : mutation
      );
  }

  if (createIndex >= 0 && next.action === "delete") {
    return queue.filter((mutation) => !(sameRecord(mutation, next) && mutation.action === "update") && mutation.id !== createMutationId);
  }

  const withoutRecordUpdates = queue.filter((mutation) => !(sameRecord(mutation, next) && mutation.action === "update"));
  if (next.action === "delete") {
    return [...withoutRecordUpdates, next];
  }

  const updateIndex = queue.findIndex((mutation) => sameRecord(mutation, next) && mutation.action === "update");
  if (updateIndex >= 0 && next.action === "update") {
    return queue.map((mutation, index) =>
      index === updateIndex
        ? {
            ...mutation,
            values: { ...(mutation.values ?? {}), ...(next.values ?? {}) }
          }
        : mutation
    );
  }

  return [...withoutRecordUpdates, next];
}
