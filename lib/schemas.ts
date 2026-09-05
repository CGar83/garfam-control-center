import { isValid, parseISO } from "date-fns";
import { z } from "zod";
import {
  billStatusOptions,
  accessSectionOptions,
  activityAudiences,
  activityStatuses,
  calendarConnectionStatuses,
  calendarProviders,
  calendarSyncDirections,
  goalStatusOptions,
  budgetCategories,
  budgetGroups,
  budgetNeedWantGoalOptions,
  budgetPayoffStrategies,
  notificationKinds,
  priorityOptions,
  roleOptions,
  taskStatusOptions,
  financialTransactionTypes,
  relationshipCycles,
  relationshipPractices,
  activityCategories,
  activitySeasons
} from "@/lib/options";
import { containsUnsafeSecret } from "@/lib/utils";

const optionalText = (max = 1000) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max).nullable().optional()
  );

const requiredText = (label: string, max = 180) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

const noSecretText = (max = 1200) =>
  optionalText(max).refine((value) => !containsUnsafeSecret(value), {
    message: "Do not store passwords, full SSNs, full account numbers, or other sensitive full identifiers here."
  });

export const optionalDateString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .refine((value) => isValid(parseISO(value)), "Enter a valid date.")
    .nullable()
    .optional()
);

const requiredDateString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => isValid(parseISO(value)), `Enter a valid ${label.toLowerCase()}.`);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().url("Enter a valid URL.").nullable().optional()
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().email("Enter a valid email.").nullable().optional()
);

const optionalMoney = z.preprocess((value) => (value === "" || value === null ? 0 : value), z.coerce.number().min(0));
const optionalInteger = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce.number().int().min(1).nullable().optional()
);
const optionalNonNegativeInteger = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce.number().int().nonnegative().nullable().optional()
);
const optionalNonNegativeMoney = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce.number().nonnegative().nullable().optional()
);
const optionalRate = z.preprocess((value) => (value === "" || value === null ? 0 : value), z.coerce.number().min(0).max(1));

export const familySchema = z.object({
  name: requiredText("Family name")
});

export const familyMemberSchema = z.object({
  display_name: requiredText("Display name"),
  role: z.enum(roleOptions),
  avatar_url: optionalUrl,
  phone: optionalText(40),
  email: optionalEmail,
  relationship: optionalText(80),
  birthdate: optionalDateString.refine((value) => !value || parseISO(value) <= new Date(), "Birthdate cannot be in the future."),
  age_label: optionalText(40),
  blocked_sections: z.array(z.enum(accessSectionOptions)).default([])
});

export const eventSchema = z
  .object({
    title: requiredText("Title"),
    description: optionalText(1200),
    category: requiredText("Category", 80),
    location: optionalText(180),
    start_at: z.string().trim().min(1, "Start date is required").refine((value) => isValid(parseISO(value)), "Enter a valid start date."),
    end_at: optionalDateString,
    all_day: z.coerce.boolean().default(false),
    recurrence_rule: optionalText(160),
    assigned_to: optionalText(80)
  })
  .refine((value) => !value.end_at || parseISO(value.end_at) >= parseISO(value.start_at), {
    message: "End date must be after the start date.",
    path: ["end_at"]
  });

export const taskSchema = z.object({
  title: requiredText("Title"),
  description: optionalText(1200),
  category: requiredText("Category", 80),
  priority: z.enum(priorityOptions),
  status: z.enum(taskStatusOptions),
  assigned_to: optionalText(80),
  due_at: optionalDateString,
  repeat_rule: optionalText(160),
  notes: optionalText(1200),
  tags: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : value,
    z.array(z.string()).optional()
  )
});

export const groceryItemSchema = z.object({
  name: requiredText("Name"),
  category: requiredText("Category", 80),
  quantity: optionalText(40),
  unit: optionalText(40),
  store: optionalText(80),
  needed_by: optionalDateString,
  checked: z.coerce.boolean().default(false)
});

export const mealPlanSchema = z.object({
  meal_date: z.string().trim().min(1, "Meal date is required").refine((value) => isValid(parseISO(value)), "Enter a valid meal date."),
  meal_type: requiredText("Meal type", 40),
  title: requiredText("Title"),
  recipe_url: optionalUrl,
  ingredients: optionalText(2000),
  notes: optionalText(1200)
});

export const financialAccountSchema = z.object({
  institution_name: requiredText("Institution"),
  account_type: requiredText("Account type", 80),
  owner_name: optionalText(120),
  last_four: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().regex(/^\d{4}$/, "Store last four digits only.").nullable().optional()
  ),
  website_url: optionalUrl,
  support_phone: optionalText(40),
  renewal_date: optionalDateString,
  password_location: optionalText(160),
  notes: noSecretText(1200)
});

export const budgetSettingsSchema = z.object({
  budget_year: z.coerce.number().int().min(2000).max(2100),
  budget_month: requiredDateString("Budget month"),
  starting_cash_available: optionalMoney,
  planned_monthly_income: optionalMoney,
  include_prior_category_balances: z.coerce.boolean().default(true),
  payoff_strategy: z.enum(budgetPayoffStrategies),
  target_utilization: optionalRate,
  excellent_utilization: optionalRate,
  high_utilization_alert: optionalRate,
  notes: noSecretText(1200)
});

export const budgetCategorySchema = z.object({
  budget_month: requiredDateString("Budget month"),
  group_name: z.enum(budgetGroups).or(requiredText("Group", 80)),
  category: z.enum(budgetCategories).or(requiredText("Category", 100)),
  need_want_goal: z.enum(budgetNeedWantGoalOptions),
  monthly_plan: optionalMoney,
  rollover: z.coerce.boolean().default(false),
  prior_balance: optionalMoney,
  notes: noSecretText(1200)
});

export const financialTransactionSchema = z.object({
  transaction_date: requiredDateString("Transaction date"),
  account_name: requiredText("Account", 120),
  transaction_type: z.enum(financialTransactionTypes),
  category: z.enum(budgetCategories).or(requiredText("Category", 100)),
  description: requiredText("Description", 180),
  amount: optionalMoney,
  cleared: z.coerce.boolean().default(true),
  recurring: z.coerce.boolean().default(false),
  owner_name: optionalText(120),
  notes: noSecretText(1200),
  tags: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : value,
    z.array(z.string()).optional()
  )
});

export const creditCardSchema = z.object({
  card_name: requiredText("Card name", 120),
  issuer: optionalText(120),
  owner_name: optionalText(120),
  last_four: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().regex(/^\d{4}$/, "Store last four digits only.").nullable().optional()
  ),
  current_balance: optionalMoney,
  credit_limit: optionalMoney,
  apr: optionalRate,
  minimum_payment: optionalMoney,
  extra_payment: optionalMoney,
  statement_day: optionalInteger,
  due_day: optionalInteger,
  due_date: optionalDateString,
  autopay: z.coerce.boolean().default(false),
  payment_account: optionalText(120),
  password_location: optionalText(160),
  notes: noSecretText(1200)
});

export const sinkingFundSchema = z.object({
  goal: requiredText("Goal", 140),
  category: requiredText("Category", 80),
  target_amount: optionalMoney,
  target_date: optionalDateString,
  saved_so_far: optionalMoney,
  planned_monthly: optionalMoney,
  notes: noSecretText(1200)
});

export const billSchema = z.object({
  name: requiredText("Name"),
  category: requiredText("Category", 80),
  amount: optionalMoney,
  due_day: optionalInteger,
  due_date: optionalDateString,
  autopay: z.coerce.boolean().default(false),
  payment_account: optionalText(120),
  status: z.enum(billStatusOptions),
  notes: optionalText(1200)
});

export const healthRecordSchema = z.object({
  person_id: optionalText(80),
  record_type: requiredText("Record type", 80),
  provider_name: optionalText(160),
  provider_phone: optionalText(40),
  policy_provider: optionalText(160),
  policy_last_four: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().regex(/^\d{4}$/, "Store last four digits only.").nullable().optional()
  ),
  medication_name: optionalText(160),
  dosage: optionalText(160),
  allergy: optionalText(160),
  condition: optionalText(160),
  appointment_date: optionalDateString,
  notes: noSecretText(1500)
});

export const schoolRecordSchema = z.object({
  child_id: optionalText(80),
  school_name: requiredText("School name"),
  grade: optionalText(40),
  teacher_name: optionalText(120),
  teacher_email: optionalEmail,
  school_phone: optionalText(40),
  pickup_notes: optionalText(1200),
  activities: optionalText(1200),
  important_dates: optionalText(1200),
  notes: optionalText(1200)
});

export const homeRecordSchema = z.object({
  category: requiredText("Category", 80),
  title: requiredText("Title"),
  vendor_name: optionalText(160),
  vendor_phone: optionalText(40),
  warranty_expiration: optionalDateString,
  maintenance_due: optionalDateString,
  location: optionalText(160),
  notes: optionalText(1200)
});

export const vehicleRecordSchema = z.object({
  vehicle_name: requiredText("Vehicle"),
  vin_last_six: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().regex(/^[A-Za-z0-9]{6}$/, "Store VIN last six only.").nullable().optional()
  ),
  plate: optionalText(20),
  insurance_provider: optionalText(160),
  policy_last_four: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().regex(/^\d{4}$/, "Store last four digits only.").nullable().optional()
  ),
  registration_due: optionalDateString,
  maintenance_due: optionalDateString,
  mileage: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().int().nonnegative().nullable().optional()
  ),
  notes: optionalText(1200)
});

export const documentSchema = z.object({
  title: requiredText("Title"),
  category: requiredText("Category", 80),
  file_url: optionalUrl,
  storage_location: optionalText(260),
  renewal_date: optionalDateString,
  owner: optionalText(120),
  notes: noSecretText(1200)
});

export const contactSchema = z.object({
  name: requiredText("Name"),
  relationship: optionalText(120),
  category: requiredText("Category", 80),
  phone: optionalText(40),
  email: optionalEmail,
  address: optionalText(260),
  notes: optionalText(1200),
  emergency_contact: z.coerce.boolean().default(false)
});

export const communicationNoteSchema = z.object({
  title: requiredText("Title"),
  message: requiredText("Message", 2000),
  category: requiredText("Category", 80),
  importance: z.enum(priorityOptions),
  related_date: optionalDateString,
  visible_to: optionalText(80),
  pinned: z.coerce.boolean().default(false)
});

export const relationshipRecordSchema = z.object({
  title: requiredText("Title"),
  category: requiredText("Category", 100),
  practice: z.enum(relationshipPractices).nullable().optional().or(optionalText(120)),
  priority: z.enum(priorityOptions),
  status: z.enum(taskStatusOptions),
  assigned_to: optionalText(80),
  due_at: optionalDateString,
  connection_score: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().min(0).max(10).nullable().optional()
  ),
  partner_a_state: optionalText(240),
  partner_b_state: optionalText(240),
  positive_interactions: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().int().nonnegative().nullable().optional()
  ),
  negative_interactions: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().int().nonnegative().nullable().optional()
  ),
  cycle_name: z.enum(relationshipCycles).nullable().optional().or(optionalText(120)),
  repair_attempt: optionalText(600),
  next_step: optionalText(600),
  notes: optionalText(1500),
  tags: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : value,
    z.array(z.string()).optional()
  )
});

export const activityIdeaSchema = z.object({
  title: requiredText("Title"),
  category: z.enum(activityCategories).or(requiredText("Category", 80)),
  audience: z.enum(activityAudiences),
  description: optionalText(1200),
  location: optionalText(180),
  estimated_cost: optionalNonNegativeMoney,
  duration_minutes: optionalNonNegativeInteger,
  season: z.enum(activitySeasons).nullable().optional().or(optionalText(80)),
  indoor: z.coerce.boolean().default(false),
  supplies: optionalText(1200),
  status: z.enum(activityStatuses),
  scheduled_event_id: optionalText(120),
  assigned_to: optionalText(80),
  notes: optionalText(1200)
});

export const calendarConnectionSchema = z.object({
  provider: z.enum(calendarProviders),
  calendar_name: requiredText("Calendar name", 120),
  sync_direction: z.enum(calendarSyncDirections),
  sync_status: z.enum(calendarConnectionStatuses),
  feed_url: optionalUrl,
  external_calendar_id: optionalText(160),
  include_events: z.coerce.boolean().default(true),
  include_tasks: z.coerce.boolean().default(false),
  include_bills: z.coerce.boolean().default(false),
  include_appointments: z.coerce.boolean().default(false),
  last_synced_at: optionalDateString,
  notes: optionalText(1200)
});

export const emergencyPlanItemSchema = z.object({
  category: requiredText("Category", 100),
  title: requiredText("Title"),
  details: noSecretText(1500),
  location: optionalText(180),
  contact_name: optionalText(120),
  contact_phone: optionalText(40),
  priority: z.enum(priorityOptions)
});

export const familyGoalSchema = z.object({
  title: requiredText("Title"),
  category: requiredText("Category", 80),
  target_date: optionalDateString,
  progress: z.coerce.number().min(0).max(100),
  status: z.enum(goalStatusOptions),
  notes: optionalText(1200)
});

export const notificationSchema = z.object({
  kind: z.enum(notificationKinds),
  title: requiredText("Title"),
  body: optionalText(500),
  entity_type: optionalText(80),
  entity_id: optionalText(120)
});

export const schemas = {
  family_members: familyMemberSchema,
  events: eventSchema,
  tasks: taskSchema,
  grocery_items: groceryItemSchema,
  meal_plans: mealPlanSchema,
  financial_accounts: financialAccountSchema,
  budget_settings: budgetSettingsSchema,
  budget_categories: budgetCategorySchema,
  financial_transactions: financialTransactionSchema,
  credit_cards: creditCardSchema,
  sinking_funds: sinkingFundSchema,
  bills: billSchema,
  health_records: healthRecordSchema,
  school_records: schoolRecordSchema,
  home_records: homeRecordSchema,
  vehicle_records: vehicleRecordSchema,
  documents: documentSchema,
  contacts: contactSchema,
  communication_notes: communicationNoteSchema,
  relationship_records: relationshipRecordSchema,
  activity_ideas: activityIdeaSchema,
  calendar_connections: calendarConnectionSchema,
  emergency_plan_items: emergencyPlanItemSchema,
  family_goals: familyGoalSchema,
  notifications: notificationSchema
};

export type SchemaKey = keyof typeof schemas;
export type FormValues<TSchema extends z.ZodTypeAny> = z.infer<TSchema>;
