import { describe, expect, it } from "vitest";
import { createOfflineMutation, mergeOfflineMutation, parseOfflineQueue } from "@/lib/offline-queue";

describe("offline mutation queue", () => {
  it("drops malformed stored queue entries", () => {
    const queue = parseOfflineQueue(
      JSON.stringify([
        { id: "bad" },
        {
          id: "offline_1",
          family_id: "family_1",
          table: "tasks",
          action: "update",
          record_id: "task_1",
          created_at: "2026-09-06T00:00:00.000Z",
          attempts: 0
        }
      ])
    );

    expect(queue).toHaveLength(1);
    expect(queue[0].record_id).toBe("task_1");
  });

  it("merges updates into a queued create", () => {
    const create = createOfflineMutation({
      familyId: "family_1",
      table: "tasks",
      action: "create",
      recordId: "task_1",
      record: { id: "task_1", title: "Original", status: "not_started" }
    });
    const update = createOfflineMutation({
      familyId: "family_1",
      table: "tasks",
      action: "update",
      recordId: "task_1",
      values: { title: "Updated", status: "done" }
    });

    const queue = mergeOfflineMutation([create], update);

    expect(queue).toHaveLength(1);
    expect(queue[0].action).toBe("create");
    expect(queue[0].record).toMatchObject({ title: "Updated", status: "done" });
  });

  it("removes a queued create when that local record is deleted before sync", () => {
    const create = createOfflineMutation({
      familyId: "family_1",
      table: "grocery_items",
      action: "create",
      recordId: "item_1",
      record: { id: "item_1", name: "Milk" }
    });
    const update = createOfflineMutation({
      familyId: "family_1",
      table: "grocery_items",
      action: "update",
      recordId: "item_1",
      values: { checked: true }
    });
    const remove = createOfflineMutation({
      familyId: "family_1",
      table: "grocery_items",
      action: "delete",
      recordId: "item_1"
    });

    expect(mergeOfflineMutation(mergeOfflineMutation([create], update), remove)).toHaveLength(0);
  });

  it("collapses repeated updates and keeps the latest field values", () => {
    const first = createOfflineMutation({
      familyId: "family_1",
      table: "tasks",
      action: "update",
      recordId: "task_1",
      values: { title: "First", priority: "medium" }
    });
    const second = createOfflineMutation({
      familyId: "family_1",
      table: "tasks",
      action: "update",
      recordId: "task_1",
      values: { priority: "urgent" }
    });

    const queue = mergeOfflineMutation([first], second);

    expect(queue).toHaveLength(1);
    expect(queue[0].values).toMatchObject({ title: "First", priority: "urgent" });
  });
});
