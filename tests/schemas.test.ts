import { describe, expect, it } from "vitest";
import {
  activityIdeaSchema,
  budgetCategorySchema,
  budgetSettingsSchema,
  calendarConnectionSchema,
  creditCardSchema,
  eventSchema,
  familyMemberSchema,
  financialAccountSchema,
  financialTransactionSchema,
  relationshipRecordSchema,
  sinkingFundSchema,
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

  it("accepts child profiles without email and with restricted sections", () => {
    const result = familyMemberSchema.safeParse({
      display_name: "Lily Rivera",
      role: "viewer",
      relationship: "Daughter",
      birthdate: "2017-04-18",
      age_label: "9",
      email: "",
      blocked_sections: ["finances", "relationship"]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.blocked_sections).toEqual(["finances", "relationship"]);
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

  it("validates workbook-style budget settings", () => {
    const result = budgetSettingsSchema.safeParse({
      budget_year: "2026",
      budget_month: "2026-09-01",
      starting_cash_available: "1500",
      planned_monthly_income: "6500",
      include_prior_category_balances: true,
      payoff_strategy: "avalanche",
      target_utilization: "0.30",
      excellent_utilization: "0.10",
      high_utilization_alert: "0.50"
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.planned_monthly_income).toBe(6500);
      expect(result.data.target_utilization).toBe(0.3);
    }
  });

  it("validates budget categories and transaction tags", () => {
    const category = budgetCategorySchema.safeParse({
      budget_month: "2026-09-01",
      group_name: "Food",
      category: "Groceries",
      need_want_goal: "need",
      monthly_plan: "850",
      rollover: false,
      prior_balance: ""
    });
    const transaction = financialTransactionSchema.safeParse({
      transaction_date: "2026-09-04",
      account_name: "Main Visa",
      transaction_type: "expense",
      category: "Groceries",
      description: "Market trip",
      amount: "185.42",
      cleared: true,
      recurring: false,
      tags: "food, weekly"
    });

    expect(category.success).toBe(true);
    expect(transaction.success).toBe(true);
    if (transaction.success) expect(transaction.data.tags).toEqual(["food", "weekly"]);
  });

  it("rejects full card numbers and stored secrets in credit card records", () => {
    const result = creditCardSchema.safeParse({
      card_name: "Main Visa",
      last_four: "1234567890123456",
      current_balance: 4200,
      credit_limit: 10000,
      apr: 0.2199,
      minimum_payment: 140,
      extra_payment: 260,
      autopay: true,
      notes: "password: SuperSecret123!"
    });

    expect(result.success).toBe(false);
  });

  it("validates sinking fund targets", () => {
    const result = sinkingFundSchema.safeParse({
      goal: "Emergency Fund",
      category: "Financial",
      target_amount: "10000",
      target_date: "",
      saved_so_far: "3500",
      planned_monthly: "500"
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.target_date).toBeNull();
  });
});
