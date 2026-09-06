import { describe, expect, it } from "vitest";
import { quickParse } from "@/lib/quick-parse";
import type { FamilyMember } from "@/lib/types";

const today = new Date(2026, 8, 5, 9, 0, 0); // Saturday Sep 5 2026, 9am
const members: FamilyMember[] = [
  { id: "m1", family_id: "f", display_name: "Ava Rivera", role: "admin", created_at: "", updated_at: "" },
  { id: "m2", family_id: "f", display_name: "Lily Rivera", role: "viewer", created_at: "", updated_at: "" },
  { id: "m3", family_id: "f", display_name: "Noah Rivera", role: "viewer", created_at: "", updated_at: "" }
];

describe("quickParse", () => {
  it("parses an event with a person, relative day, and time", () => {
    const result = quickParse("Dentist for Lily tomorrow 3pm", members, today);
    expect(result.kind).toBe("event");
    expect(result.memberId).toBe("m2");
    expect(result.hasTime).toBe(true);
    expect(new Date(result.date as string).getDate()).toBe(6);
    expect(new Date(result.date as string).getHours()).toBe(15);
    expect(result.title).toBe("Dentist");
  });

  it("parses grocery items", () => {
    const result = quickParse("Buy milk and eggs", members, today);
    expect(result.kind).toBe("grocery");
    expect(result.title).toBe("Milk and eggs");
  });

  it("parses a task due on a weekday", () => {
    const result = quickParse("Pay water bill Friday", members, today);
    expect(result.kind).toBe("task");
    expect(result.date).toBe("2026-09-11");
    expect(result.title).toBe("Pay water bill");
  });

  it("parses an expense with an amount", () => {
    const result = quickParse("$42 gas", members, today);
    expect(result.kind).toBe("transaction");
    expect(result.amount).toBe(42);
    expect(result.title).toBe("Gas");
  });

  it("keeps possessive names in the title and still assigns the member", () => {
    const result = quickParse("Noah's soccer game Saturday 10am", members, today);
    expect(result.kind).toBe("event");
    expect(result.memberId).toBe("m3");
    expect(result.title).toContain("Noah's soccer game");
    expect(new Date(result.date as string).getDay()).toBe(6);
  });

  it("recognizes explicit note and memory prefixes", () => {
    expect(quickParse("Remember: Grandma calls Sunday", members, today).kind).toBe("note");
    const memory = quickParse("Memory: Lily rode without training wheels", members, today);
    expect(memory.kind).toBe("memory");
    expect(memory.memberId).toBe("m2");
    expect(memory.date).toBe("2026-09-05");
  });

  it("parses month-name dates and rolls past dates into next year", () => {
    const result = quickParse("Renew passports on Mar 3", members, today);
    expect(result.kind).toBe("task");
    expect(result.date).toBe("2027-03-03");
  });

  it("defaults bare text to a task with no date", () => {
    const result = quickParse("Look into summer camps", members, today);
    expect(result.kind).toBe("task");
    expect(result.date).toBeNull();
  });
});

describe("guessGroceryCategory", () => {
  it("categorizes common items", async () => {
    const { guessGroceryCategory } = await import("@/components/grocery/quick-grocery-bar");
    expect(guessGroceryCategory("2% milk")).toBe("Dairy");
    expect(guessGroceryCategory("bananas")).toBe("Produce");
    expect(guessGroceryCategory("paper towels")).toBe("Household");
    expect(guessGroceryCategory("mystery item")).toBe("Other");
  });
});
