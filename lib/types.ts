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
export type NotificationKind =
  | "due_soon"
  | "overdue"
  | "communication_note"
  | "assigned_task"
  | "upcoming_event"
  | "upcoming_bill"
  | "upcoming_appointment";

export type ViewMode = "list" | "kanban" | "month" | "week" | "agenda" | "shopping" | "weekly";

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
  ingredients?: string | null;
  notes?: string | null;
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

export interface DataStore {
  families: Family[];
  family_members: FamilyMember[];
  events: EventRecord[];
  tasks: TaskRecord[];
  grocery_items: GroceryItem[];
  meal_plans: MealPlan[];
  financial_accounts: FinancialAccount[];
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
}
