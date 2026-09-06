export type Role = "admin" | "parent" | "viewer";
export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "not_started" | "in_progress" | "waiting" | "done";
export type BillStatus = "upcoming" | "paid" | "overdue";
export type GoalStatus = "not_started" | "in_progress" | "complete" | "paused";
export type CalendarProvider = "google" | "apple" | "outlook" | "ics" | "other";
export type CalendarSyncDirection = "export" | "import" | "two_way";
export type CalendarConnectionStatus = "setup_required" | "active" | "paused" | "error";
export type ActivityAudience = "son" | "daughter" | "all_kids" | "date_night" | "family";
export type ActivityStatus = "idea" | "planned" | "done";
export type AccessSection =
  | "finances"
  | "accounts"
  | "health"
  | "documents"
  | "contacts"
  | "communication"
  | "relationship"
  | "emergency";
export type BudgetNeedWantGoal = "need" | "want" | "goal";
export type BudgetPayoffStrategy = "avalanche" | "snowball";
export type FinancialTransactionType = "income" | "expense" | "transfer" | "credit_payment";
export type NotificationKind =
  | "due_soon"
  | "overdue"
  | "communication_note"
  | "assigned_task"
  | "upcoming_event"
  | "upcoming_bill"
  | "upcoming_appointment"
  | "chore_completed"
  | "reward_claimed"
  | "checkin_shared"
  | "milestone_soon"
  | "nudge";

export type ViewMode = "list" | "kanban" | "month" | "week" | "agenda" | "shopping" | "weekly";
export type ChoreFrequency = "daily" | "weekdays" | "weekends" | "weekly" | "custom";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";
export type MilestoneKind = "birthday" | "anniversary" | "trip" | "holiday" | "school" | "custom";
export type ListKind = "todo" | "shopping" | "packing" | "wishlist" | "project" | "custom";
export type MemberColor = "coral" | "ocean" | "sunshine" | "meadow" | "lavender" | "sky" | "peach" | "rose";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Family {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyScopedRecord {
  id: string;
  family_id: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember extends FamilyScopedRecord {
  user_id?: string | null;
  display_name: string;
  role: Role;
  avatar_url?: string | null;
  phone?: string | null;
  email?: string | null;
  relationship?: string | null;
  birthdate?: string | null;
  age_label?: string | null;
  blocked_sections?: AccessSection[];
  color?: MemberColor | null;
}

export interface EventRecord extends FamilyScopedRecord {
  title: string;
  description?: string | null;
  category: string;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day: boolean;
  recurrence_rule?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
}

export interface TaskRecord extends FamilyScopedRecord {
  title: string;
  description?: string | null;
  category: string;
  priority: Priority;
  status: TaskStatus;
  assigned_to?: string | null;
  due_at?: string | null;
  repeat_rule?: string | null;
  completed_at?: string | null;
  created_by?: string | null;
  tags?: string[];
  notes?: string | null;
}

export interface GroceryItem extends FamilyScopedRecord {
  name: string;
  category: string;
  quantity?: string | null;
  unit?: string | null;
  store?: string | null;
  needed_by?: string | null;
  checked: boolean;
  added_by?: string | null;
}

export interface MealPlan extends FamilyScopedRecord {
  meal_date: string;
  meal_type: string;
  title: string;
  recipe_url?: string | null;
  recipe_id?: string | null;
  ingredients?: string | null;
  notes?: string | null;
  cook_id?: string | null;
}

export interface FinancialAccount extends FamilyScopedRecord {
  institution_name: string;
  account_type: string;
  owner_name?: string | null;
  last_four?: string | null;
  website_url?: string | null;
  support_phone?: string | null;
  renewal_date?: string | null;
  password_location?: string | null;
  notes?: string | null;
}

export interface BudgetSettings extends FamilyScopedRecord {
  budget_year: number;
  budget_month: string;
  starting_cash_available: number;
  planned_monthly_income: number;
  include_prior_category_balances: boolean;
  payoff_strategy: BudgetPayoffStrategy;
  target_utilization: number;
  excellent_utilization: number;
  high_utilization_alert: number;
  notes?: string | null;
}

export interface BudgetCategory extends FamilyScopedRecord {
  budget_month: string;
  group_name: string;
  category: string;
  need_want_goal: BudgetNeedWantGoal;
  monthly_plan: number;
  rollover: boolean;
  prior_balance: number;
  notes?: string | null;
}

export interface FinancialTransaction extends FamilyScopedRecord {
  transaction_date: string;
  account_name: string;
  transaction_type: FinancialTransactionType;
  category: string;
  description: string;
  amount: number;
  cleared: boolean;
  recurring: boolean;
  owner_name?: string | null;
  notes?: string | null;
  tags?: string[];
  created_by?: string | null;
}

export interface CreditCard extends FamilyScopedRecord {
  card_name: string;
  issuer?: string | null;
  owner_name?: string | null;
  last_four?: string | null;
  current_balance: number;
  credit_limit: number;
  apr: number;
  minimum_payment: number;
  extra_payment: number;
  statement_day?: number | null;
  due_day?: number | null;
  due_date?: string | null;
  autopay: boolean;
  payment_account?: string | null;
  password_location?: string | null;
  notes?: string | null;
}

export interface SinkingFund extends FamilyScopedRecord {
  goal: string;
  category: string;
  target_amount: number;
  target_date?: string | null;
  saved_so_far: number;
  planned_monthly: number;
  notes?: string | null;
}

export interface Bill extends FamilyScopedRecord {
  name: string;
  category: string;
  amount: number;
  due_day?: number | null;
  due_date?: string | null;
  autopay: boolean;
  payment_account?: string | null;
  status: BillStatus;
  notes?: string | null;
}

export interface HealthRecord extends FamilyScopedRecord {
  person_id?: string | null;
  record_type: string;
  provider_name?: string | null;
  provider_phone?: string | null;
  policy_provider?: string | null;
  policy_last_four?: string | null;
  medication_name?: string | null;
  dosage?: string | null;
  allergy?: string | null;
  condition?: string | null;
  appointment_date?: string | null;
  notes?: string | null;
}

export interface SchoolRecord extends FamilyScopedRecord {
  child_id?: string | null;
  school_name: string;
  grade?: string | null;
  teacher_name?: string | null;
  teacher_email?: string | null;
  school_phone?: string | null;
  pickup_notes?: string | null;
  activities?: string | null;
  important_dates?: string | null;
  notes?: string | null;
}

export interface HomeRecord extends FamilyScopedRecord {
  category: string;
  title: string;
  vendor_name?: string | null;
  vendor_phone?: string | null;
  warranty_expiration?: string | null;
  maintenance_due?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface VehicleRecord extends FamilyScopedRecord {
  vehicle_name: string;
  vin_last_six?: string | null;
  plate?: string | null;
  insurance_provider?: string | null;
  policy_last_four?: string | null;
  registration_due?: string | null;
  maintenance_due?: string | null;
  mileage?: number | null;
  notes?: string | null;
}

export interface DocumentRecord extends FamilyScopedRecord {
  title: string;
  category: string;
  file_url?: string | null;
  storage_location?: string | null;
  renewal_date?: string | null;
  owner?: string | null;
  notes?: string | null;
}

export interface ContactRecord extends FamilyScopedRecord {
  name: string;
  relationship?: string | null;
  category: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  emergency_contact: boolean;
}

export interface CommunicationNote extends FamilyScopedRecord {
  title: string;
  message: string;
  category: string;
  importance: Priority;
  related_date?: string | null;
  visible_to?: string | null;
  acknowledged_by?: string[] | null;
  created_by?: string | null;
  pinned?: boolean;
}

export interface RelationshipRecord extends FamilyScopedRecord {
  title: string;
  category: string;
  practice?: string | null;
  priority: Priority;
  status: TaskStatus;
  assigned_to?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  connection_score?: number | null;
  partner_a_state?: string | null;
  partner_b_state?: string | null;
  positive_interactions?: number | null;
  negative_interactions?: number | null;
  cycle_name?: string | null;
  repair_attempt?: string | null;
  next_step?: string | null;
  notes?: string | null;
  tags?: string[];
  created_by?: string | null;
}

export interface ActivityIdea extends FamilyScopedRecord {
  title: string;
  category: string;
  audience: ActivityAudience;
  description?: string | null;
  location?: string | null;
  estimated_cost?: number | null;
  duration_minutes?: number | null;
  season?: string | null;
  indoor: boolean;
  supplies?: string | null;
  status: ActivityStatus;
  scheduled_event_id?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export interface CalendarConnection extends FamilyScopedRecord {
  provider: CalendarProvider;
  calendar_name: string;
  sync_direction: CalendarSyncDirection;
  sync_status: CalendarConnectionStatus;
  feed_url?: string | null;
  external_calendar_id?: string | null;
  embed_url?: string | null;
  embed_enabled: boolean;
  embed_height?: number | null;
  include_events: boolean;
  include_tasks: boolean;
  include_bills: boolean;
  include_appointments: boolean;
  last_synced_at?: string | null;
  notes?: string | null;
}

export interface EmergencyPlanItem extends FamilyScopedRecord {
  category: string;
  title: string;
  details?: string | null;
  location?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  priority: Priority;
}

export interface FamilyGoal extends FamilyScopedRecord {
  title: string;
  category: string;
  target_date?: string | null;
  progress: number;
  status: GoalStatus;
  notes?: string | null;
}

export interface NotificationRecord extends FamilyScopedRecord {
  kind: NotificationKind;
  title: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  read_at?: string | null;
}

export interface ActivityLog {
  id: string;
  family_id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  summary: string;
  created_at: string;
}

export interface Chore extends FamilyScopedRecord {
  title: string;
  emoji?: string | null;
  assigned_to?: string | null;
  points: number;
  frequency: ChoreFrequency;
  days_of_week?: number[];
  time_of_day: TimeOfDay;
  active: boolean;
  notes?: string | null;
  created_by?: string | null;
}

export interface ChoreCompletion extends FamilyScopedRecord {
  chore_id: string;
  member_id?: string | null;
  completed_on: string;
  points_awarded: number;
  approved_by?: string | null;
}

export interface Reward extends FamilyScopedRecord {
  title: string;
  emoji?: string | null;
  cost_points: number;
  description?: string | null;
  available: boolean;
  for_member_id?: string | null;
}

export interface RewardClaim extends FamilyScopedRecord {
  reward_id: string;
  member_id: string;
  points_spent: number;
  claimed_on: string;
  fulfilled: boolean;
}

export interface Routine extends FamilyScopedRecord {
  title: string;
  emoji?: string | null;
  member_id?: string | null;
  time_of_day: TimeOfDay;
  steps: string[];
  days_of_week?: number[];
  active: boolean;
}

export interface RoutineCompletion extends FamilyScopedRecord {
  routine_id: string;
  member_id?: string | null;
  completed_on: string;
  steps_done: number[];
}

export interface Checkin extends FamilyScopedRecord {
  member_id?: string | null;
  checkin_date: string;
  mood: number;
  energy: number;
  gratitude?: string | null;
  needs?: string | null;
  note?: string | null;
  shared_with_partner: boolean;
}

export interface JournalEntry extends FamilyScopedRecord {
  entry_date: string;
  title: string;
  body?: string | null;
  author_id?: string | null;
  people?: string[];
  tags?: string[];
  mood?: string | null;
  highlight: boolean;
}

export interface Milestone extends FamilyScopedRecord {
  title: string;
  kind: MilestoneKind;
  date: string;
  emoji?: string | null;
  member_id?: string | null;
  recurring_yearly: boolean;
  notes?: string | null;
}

export interface SharedList extends FamilyScopedRecord {
  name: string;
  kind: ListKind;
  emoji?: string | null;
  description?: string | null;
  archived: boolean;
  created_by?: string | null;
}

export interface ListItem extends FamilyScopedRecord {
  list_id: string;
  name: string;
  checked: boolean;
  quantity?: string | null;
  note?: string | null;
  assigned_to?: string | null;
  sort_order: number;
  added_by?: string | null;
}

export interface Recipe extends FamilyScopedRecord {
  title: string;
  emoji?: string | null;
  cuisine?: string | null;
  meal_type: string;
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  servings?: number | null;
  ingredients?: string | null;
  instructions?: string | null;
  source_url?: string | null;
  tags?: string[];
  favorite: boolean;
  kid_approved: boolean;
  last_cooked_on?: string | null;
  rating?: number | null;
  notes?: string | null;
}

export interface WeeklyReview extends FamilyScopedRecord {
  week_start: string;
  completed_steps: string[];
  wins?: string | null;
  focus?: string | null;
  worries?: string | null;
  date_night_plan?: string | null;
  completed_at?: string | null;
  reviewed_by?: string[];
}

export interface DataStore {
  families: Family[];
  family_members: FamilyMember[];
  events: EventRecord[];
  tasks: TaskRecord[];
  grocery_items: GroceryItem[];
  meal_plans: MealPlan[];
  financial_accounts: FinancialAccount[];
  budget_settings: BudgetSettings[];
  budget_categories: BudgetCategory[];
  financial_transactions: FinancialTransaction[];
  credit_cards: CreditCard[];
  sinking_funds: SinkingFund[];
  bills: Bill[];
  health_records: HealthRecord[];
  school_records: SchoolRecord[];
  home_records: HomeRecord[];
  vehicle_records: VehicleRecord[];
  documents: DocumentRecord[];
  contacts: ContactRecord[];
  communication_notes: CommunicationNote[];
  relationship_records: RelationshipRecord[];
  activity_ideas: ActivityIdea[];
  calendar_connections: CalendarConnection[];
  emergency_plan_items: EmergencyPlanItem[];
  family_goals: FamilyGoal[];
  chores: Chore[];
  chore_completions: ChoreCompletion[];
  rewards: Reward[];
  reward_claims: RewardClaim[];
  routines: Routine[];
  routine_completions: RoutineCompletion[];
  checkins: Checkin[];
  journal_entries: JournalEntry[];
  milestones: Milestone[];
  shared_lists: SharedList[];
  list_items: ListItem[];
  recipes: Recipe[];
  weekly_reviews: WeeklyReview[];
  notifications: NotificationRecord[];
  activity_log: ActivityLog[];
}

export type TableName = keyof DataStore;
export type TableRecord<TTable extends TableName> = DataStore[TTable][number];
export type AnyRecord = DataStore[TableName][number];

export interface CurrentUser {
  id: string;
  member_id?: string | null;
  email: string;
  display_name: string;
  role: Role;
  blocked_sections?: AccessSection[];
}
