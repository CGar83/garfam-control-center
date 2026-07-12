import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { applyRecordFilters, defaultFilters, searchData } from "@/lib/filtering";
import { createSeedData } from "@/lib/seed-data";
import type { TaskRecord } from "@/lib/types";
import { maskValue } from "@/lib/utils";

describe("filtering and search", () => {
  it("searches across supported app tables", () => {
    const data = createSeedData();
    const results = searchData(data, "permission slip");

    expect(results.some((result) => result.table === "tasks" && result.title.includes("permission"))).toBe(true);
  });

  it("searches activity ideas", () => {
    const data = createSeedData();
    const results = searchData(data, "bookstore");

    expect(results.some((result) => result.table === "activity_ideas" && result.route.startsWith("/activities"))).toBe(true);
  });

  it("filters overdue records", () => {
    const records: TaskRecord[] = [
      {
        id: "task_old",
        family_id: "family",
        title: "Old task",
        description: null,
        category: "Home",
        priority: "high",
        status: "not_started",
        assigned_to: "member_1",
        due_at: addDays(new Date(), -2).toISOString(),
        repeat_rule: null,
        completed_at: null,
        created_by: "member_1",
        tags: [],
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "task_future",
        family_id: "family",
        title: "Future task",
        description: null,
        category: "Home",
        priority: "low",
        status: "not_started",
        assigned_to: "member_1",
        due_at: addDays(new Date(), 4).toISOString(),
        repeat_rule: null,
        completed_at: null,
        created_by: "member_1",
        tags: [],
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const filtered = applyRecordFilters(records, { ...defaultFilters, date: "overdue" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("task_old");
  });

  it("masks sensitive values", () => {
    expect(maskValue("1234", 4)).toBe("••••1234");
    expect(maskValue("private")).toBe("•••••••");
  });
});
