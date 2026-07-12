import { describe, expect, it } from "vitest";
import {
  activityIdeaSchema,
  calendarConnectionSchema,
  eventSchema,
  financialAccountSchema,
  relationshipRecordSchema,
  taskSchema,
  vehicleRecordSchema
} from "@/lib/schemas";

describe("validation schemas", () => {
  it("accepts a task with empty optional date fields", () => {
    const result = taskSchema.safeParse({
      title: "Take out recycling",
      category: "Home",
      priority: "medium",
      status: "not_started",
      due_at: "",
      repeat_rule: "",
      tags: "home, weekly"
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.due_at).toBeNull();
      expect(result.data.tags).toEqual(["home", "weekly"]);
    }
  });

  it("rejects account notes that look like stored secrets", () => {
    const result = financialAccountSchema.safeParse({
      institution_name: "Example Bank",
      account_type: "Banking",
      last_four: "1234",
      notes: "password: SuperSecret123!"
    });

    expect(result.success).toBe(false);
  });

  it("requires financial last four to be exactly four digits", () => {
    const result = financialAccountSchema.safeParse({
      institution_name: "Example Bank",
      account_type: "Banking",
      last_four: "123456"
    });

    expect(result.success).toBe(false);
  });

  it("rejects events ending before they start", () => {
    const result = eventSchema.safeParse({
      title: "Appointment",
      category: "Medical",
      start_at: "2026-06-23T10:00",
      end_at: "2026-06-23T09:00",
      all_day: false
    });

    expect(result.success).toBe(false);
  });

  it("validates vehicle VIN last six only", () => {
    const result = vehicleRecordSchema.safeParse({
      vehicle_name: "Family car",
      vin_last_six: "ABC123",
      mileage: "12000"
    });

    expect(result.success).toBe(true);
  });

  it("validates relationship check-ins and bounds connection score", () => {
    const result = relationshipRecordSchema.safeParse({
      title: "Weekly state of the union",
      category: "Check-In",
      practice: "Weekly state of the union",
      priority: "medium",
      status: "not_started",
      connection_score: 11
    });

    expect(result.success).toBe(false);
  });

  it("validates activity ideas for child and date-night planning", () => {
    const result = activityIdeaSchema.safeParse({
      title: "Bookstore date night",
      category: "Date Night",
      audience: "date_night",
      estimated_cost: "45",
      duration_minutes: "150",
      season: "Anytime",
      indoor: true,
      status: "idea"
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimated_cost).toBe(45);
      expect(result.data.duration_minutes).toBe(150);
    }
  });

  it("validates calendar connection feed URLs", () => {
    const result = calendarConnectionSchema.safeParse({
      provider: "google",
      calendar_name: "Family Calendar",
      sync_direction: "export",
      sync_status: "setup_required",
      feed_url: "not-a-url",
      include_events: true,
      include_tasks: false,
      include_bills: false,
      include_appointments: true
    });

    expect(result.success).toBe(false);
  });
});
