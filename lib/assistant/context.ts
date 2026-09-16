import { z } from "zod";
import type { TableName } from "@/lib/types";

export const sections = {
  calendar: { label: "Calendar", sensitive: false },
  tasks: { label: "Tasks & routines", sensitive: false },
  meals: { label: "Lists & meals", sensitive: false },
  home: { label: "Home & vehicles", sensitive: false },
  goals: { label: "Goals & activities", sensitive: false },
  family: { label: "Family profiles", sensitive: true },
  finances: { label: "Finances & transactions", sensitive: true },
  accounts: { label: "Account references", sensitive: true },
  health: { label: "Health", sensitive: true },
  school: { label: "School", sensitive: true },
  documents: { label: "Document notes", sensitive: true },
  contacts: { label: "Contacts", sensitive: true },
  communication: { label: "Communication", sensitive: true },
  relationship: { label: "Relationship", sensitive: true },
  emergency: { label: "Emergency", sensitive: true },
  memories: { label: "Memories", sensitive: true },
} as const;
export type AssistantSection = keyof typeof sections;
export const sectionKeys = Object.keys(sections) as AssistantSection[];
type SourceConfig = {
  section: AssistantSection;
  path: string;
  label: string;
  columns: string;
  title: string;
  keyword: string;
  date?: string;
};
function source(
  section: AssistantSection,
  path: string,
  label: string,
  title: string,
  columns: string,
  date?: string,
): SourceConfig {
  return {
    section,
    path,
    label,
    title,
    keyword:
      title === "budget_month"
        ? "notes"
        : title === "checkin_date"
          ? "note"
          : title === "week_start"
            ? "focus"
            : title,
    columns: `id,updated_at,${columns}`,
    date,
  };
}

// Explicit field allowlists: never send credentials, identifiers, storage URLs, or raw files.
export const sourceCatalog = {
  events: source(
    "calendar",
    "/calendar",
    "Events",
    "title",
    "title,description,category,start_at,end_at,all_day,recurrence_rule,assigned_to",
    "start_at",
  ),
  tasks: source(
    "tasks",
    "/tasks",
    "Tasks",
    "title",
    "title,description,category,priority,status,assigned_to,due_at,repeat_rule,completed_at,notes",
    "due_at",
  ),
  chores: source(
    "tasks",
    "/chores",
    "Chores",
    "title",
    "title,assigned_to,points,frequency,days_of_week,time_of_day,active,notes",
  ),
  chore_completions: source(
    "tasks",
    "/chores",
    "Chore completions",
    "chore_id",
    "chore_id,member_id,completed_on,points_awarded",
    "completed_on",
  ),
  routines: source(
    "tasks",
    "/routines",
    "Routines",
    "title",
    "title,member_id,time_of_day,steps,days_of_week,active",
  ),
  routine_completions: source(
    "tasks",
    "/routines",
    "Routine completions",
    "routine_id",
    "routine_id,member_id,completed_on,steps_done",
    "completed_on",
  ),
  rewards: source(
    "tasks",
    "/chores",
    "Rewards",
    "title",
    "title,cost_points,description,available,for_member_id",
  ),
  reward_claims: source(
    "tasks",
    "/chores",
    "Reward claims",
    "reward_id",
    "reward_id,member_id,points_spent,claimed_on,fulfilled",
    "claimed_on",
  ),
  grocery_items: source(
    "meals",
    "/grocery",
    "Groceries",
    "name",
    "name,category,quantity,unit,store,needed_by,checked",
    "needed_by",
  ),
  meal_plans: source(
    "meals",
    "/meals",
    "Meal plans",
    "title",
    "title,meal_date,meal_type,ingredients,notes",
    "meal_date",
  ),
  recipes: source(
    "meals",
    "/recipes",
    "Recipes",
    "title",
    "title,cuisine,meal_type,prep_minutes,cook_minutes,servings,ingredients,instructions,tags,favorite,kid_approved,notes",
  ),
  shared_lists: source(
    "meals",
    "/lists",
    "Lists",
    "name",
    "name,kind,description,archived",
  ),
  list_items: source(
    "meals",
    "/lists",
    "List items",
    "name",
    "list_id,name,checked,quantity,note,assigned_to",
  ),
  home_records: source(
    "home",
    "/home",
    "Home records",
    "title",
    "title,category,vendor_name,warranty_expiration,maintenance_due,notes",
    "maintenance_due",
  ),
  vehicle_records: source(
    "home",
    "/vehicles",
    "Vehicles",
    "vehicle_name",
    "vehicle_name,insurance_provider,registration_due,maintenance_due,mileage,notes",
    "maintenance_due",
  ),
  family_goals: source(
    "goals",
    "/goals",
    "Family goals",
    "title",
    "title,category,target_date,progress,status,notes",
    "target_date",
  ),
  activity_ideas: source(
    "goals",
    "/activities",
    "Activity ideas",
    "title",
    "title,category,audience,description,estimated_cost,duration_minutes,season,indoor,supplies,status,scheduled_event_id,assigned_to,notes",
  ),
  family_members: source(
    "family",
    "/settings",
    "Family members",
    "display_name",
    "display_name,relationship,age_label",
  ),
  recovery_plans: source(
    "finances",
    "/finances",
    "Recovery plans",
    "name",
    "name,monthly_income,housing,debt_minimums,utilities,groceries,transportation,health,subscription_cap,lifestyle_cap,reserve_contribution,reserve_target,reserve_saved,score,score_model,as_of_date,start_date,notes",
    "as_of_date",
  ),
  recovery_subscriptions: source(
    "finances",
    "/finances",
    "Subscriptions",
    "name",
    "name,amount,frequency,decision,status,renewal_date,recommendation,notes",
    "renewal_date",
  ),
  financial_assets: source(
    "finances",
    "/finances",
    "Assets",
    "name",
    "name,category,estimated_value,debt,as_of_date,notes",
    "as_of_date",
  ),
  installment_debts: source(
    "finances",
    "/finances",
    "Installment debts",
    "name",
    "name,balance,monthly_payment,apr,due_date,notes",
    "due_date",
  ),
  finance_actions: source(
    "finances",
    "/finances",
    "Finance actions",
    "title",
    "title,phase,status,priority,due_date,notes",
    "due_date",
  ),
  credit_cards: source(
    "finances",
    "/budget",
    "Credit cards",
    "card_name",
    "card_name,issuer,current_balance,credit_limit,apr,minimum_payment,extra_payment,statement_day,due_date,autopay,notes",
    "due_date",
  ),
  bills: source(
    "finances",
    "/bills",
    "Bills",
    "name",
    "name,category,amount,due_date,autopay,status,notes",
    "due_date",
  ),
  budget_settings: source(
    "finances",
    "/budget",
    "Budget settings",
    "budget_month",
    "budget_year,budget_month,starting_cash_available,planned_monthly_income,include_prior_category_balances,payoff_strategy,target_utilization,notes",
    "budget_month",
  ),
  budget_categories: source(
    "finances",
    "/budget",
    "Budget categories",
    "category",
    "budget_month,group_name,category,monthly_plan,rollover,prior_balance,need_want_goal,notes",
    "budget_month",
  ),
  financial_transactions: source(
    "finances",
    "/budget",
    "Transactions",
    "description",
    "transaction_date,transaction_type,category,description,amount,cleared,recurring,notes,tags",
    "transaction_date",
  ),
  sinking_funds: source(
    "finances",
    "/budget",
    "Savings goals",
    "goal",
    "goal,category,target_amount,target_date,saved_so_far,planned_monthly,notes",
    "target_date",
  ),
  financial_accounts: source(
    "accounts",
    "/accounts",
    "Account references",
    "institution_name",
    "institution_name,account_type,renewal_date",
    "renewal_date",
  ),
  health_records: source(
    "health",
    "/health",
    "Health records",
    "record_type",
    "person_id,record_type,provider_name,medication_name,dosage,allergy,condition,appointment_date,notes",
    "appointment_date",
  ),
  school_records: source(
    "school",
    "/school",
    "School records",
    "school_name",
    "child_id,school_name,grade,teacher_name,activities,important_dates,notes",
  ),
  documents: source(
    "documents",
    "/documents",
    "Document references",
    "title",
    "title,category,renewal_date,owner,notes",
    "renewal_date",
  ),
  contacts: source(
    "contacts",
    "/contacts",
    "Contacts",
    "name",
    "name,relationship,category,notes,emergency_contact",
  ),
  communication_notes: source(
    "communication",
    "/communication",
    "Communication notes",
    "title",
    "title,message,category,importance,related_date,visible_to,created_by,pinned",
    "related_date",
  ),
  relationship_records: source(
    "relationship",
    "/relationship",
    "Relationship records",
    "title",
    "title,category,practice,priority,status,assigned_to,due_at,connection_score,partner_a_state,partner_b_state,cycle_name,repair_attempt,next_step,notes",
    "due_at",
  ),
  checkins: source(
    "relationship",
    "/checkin",
    "Check-ins",
    "checkin_date",
    "member_id,checkin_date,mood,energy,gratitude,needs,note,shared_with_partner",
    "checkin_date",
  ),
  weekly_reviews: source(
    "relationship",
    "/planning",
    "Weekly reviews",
    "week_start",
    "week_start,wins,focus,worries,date_night_plan,completed_at",
    "week_start",
  ),
  emergency_plan_items: source(
    "emergency",
    "/emergency",
    "Emergency plans",
    "title",
    "title,category,details,location,contact_name,priority",
  ),
  journal_entries: source(
    "memories",
    "/memories",
    "Memories",
    "title",
    "title,entry_date,body,people,tags,mood,highlight",
    "entry_date",
  ),
  milestones: source(
    "memories",
    "/memories",
    "Milestones",
    "title",
    "title,kind,date,member_id,recurring_yearly,notes",
    "date",
  ),
} satisfies Partial<Record<TableName, SourceConfig>>;
export type SourceTable = keyof typeof sourceCatalog;
export const sourceTables = Object.keys(sourceCatalog) as SourceTable[];
export const sourceTableSchema = z.enum(
  sourceTables as [SourceTable, ...SourceTable[]],
);
const sectionSchema = z.enum(
  sectionKeys as [AssistantSection, ...AssistantSection[]],
);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const parsed = new Date(v);
    return (
      !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v
    );
  }, "Enter a valid date");
export const assistantContextSchema = z
  .object({
    mode: z.enum(["page", "workspace", "record"]),
    page: z
      .string()
      .max(80)
      .refine((v) => /^\/[a-z-]*$/.test(v)),
    sections: z.array(sectionSchema).max(sectionKeys.length),
    record: z
      .object({ table: sourceTableSchema, id: z.string().min(1).max(160) })
      .strict()
      .optional(),
    search: z.string().trim().max(100).default(""),
    from: date.optional(),
    to: date.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.from && v.to && v.from > v.to)
      ctx.addIssue({
        code: "custom",
        message: "Start date must precede end date",
      });
    if (v.mode === "record" && !v.record)
      ctx.addIssue({ code: "custom", message: "Choose a record" });
    if (v.mode !== "record" && v.record)
      ctx.addIssue({ code: "custom", message: "Record scope required" });
    if (v.record && !v.sections.includes(sourceCatalog[v.record.table].section))
      ctx.addIssue({
        code: "custom",
        message: "Include this record's section first",
      });
  });
export type AssistantContext = z.infer<typeof assistantContextSchema>;
export function tablesForContext(context: AssistantContext): SourceTable[] {
  if (context.mode === "record")
    return context.record ? [context.record.table] : [];
  return sourceTables.filter((table) => {
    const config = sourceCatalog[table];
    if (!context.sections.includes(config.section)) return false;
    if (context.mode === "workspace") return true;
    if (context.page === "/finances") return config.section === "finances";
    if (["/today", "/dashboard"].includes(context.page))
      return ["calendar", "tasks", "meals", "goals"].includes(config.section);
    return config.path === context.page;
  });
}
export function defaultContext(page: string): AssistantContext {
  const candidates = tablesForContext({
    mode: "page",
    page,
    sections: sectionKeys,
    search: "",
  });
  return {
    mode: "page",
    page,
    search: "",
    sections: [
      ...new Set(candidates.map((t) => sourceCatalog[t].section)),
    ].filter((s) => !sections[s].sensitive),
  };
}
export const assistantSourceSchema = z.object({
  ref: z.string().regex(/^S\d+$/),
  table: sourceTableSchema,
  id: z.string().min(1).max(160),
  title: z.string().max(160),
  updated_at: z.string().max(40),
});
export const coverageSchema = z.object({
  table: sourceTableSchema,
  available: z.number().int().nonnegative(),
  included: z.number().int().nonnegative(),
  clipped: z.boolean(),
  date_filtered: z.boolean(),
});
export type AssistantSource = z.infer<typeof assistantSourceSchema>;
export type AssistantCoverage = z.infer<typeof coverageSchema>;
export function sourceHref(source: AssistantSource) {
  return `${sourceCatalog[source.table].path}?record=${encodeURIComponent(source.id)}`;
}
