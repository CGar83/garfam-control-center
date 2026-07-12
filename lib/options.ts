import type {
  ActivityAudience,
  ActivityStatus,
  BillStatus,
  CalendarConnectionStatus,
  CalendarProvider,
  CalendarSyncDirection,
  GoalStatus,
  Priority,
  Role,
  TaskStatus
} from "@/lib/types";

export const roleOptions = ["admin", "parent", "viewer"] as const satisfies readonly Role[];
export const priorityOptions = ["low", "medium", "high", "urgent"] as const satisfies readonly Priority[];
export const taskStatusOptions = ["not_started", "in_progress", "waiting", "done"] as const satisfies readonly TaskStatus[];
export const billStatusOptions = ["upcoming", "paid", "overdue"] as const satisfies readonly BillStatus[];
export const goalStatusOptions = ["not_started", "in_progress", "complete", "paused"] as const satisfies readonly GoalStatus[];
export const calendarProviders = ["google", "apple", "outlook", "ics", "other"] as const satisfies readonly CalendarProvider[];
export const calendarSyncDirections = ["export", "import", "two_way"] as const satisfies readonly CalendarSyncDirection[];
export const calendarConnectionStatuses = ["setup_required", "active", "paused", "error"] as const satisfies readonly CalendarConnectionStatus[];
export const activityAudiences = ["son", "daughter", "all_kids", "date_night", "family"] as const satisfies readonly ActivityAudience[];
export const activityStatuses = ["idea", "planned", "done"] as const satisfies readonly ActivityStatus[];

export const eventCategories = ["Family", "School", "Medical", "Work", "Sports", "Travel", "Bills", "Home", "Vehicle"];
export const groceryCategories = [
  "Produce",
  "Meat and Seafood",
  "Dairy",
  "Frozen",
  "Pantry",
  "Snacks",
  "Drinks",
  "Household",
  "Baby and Kids",
  "Pets",
  "Other"
];
export const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];
export const accountCategories = [
  "Banking",
  "Insurance",
  "Utilities",
  "Medical",
  "School",
  "Subscriptions",
  "Government",
  "Home",
  "Vehicle",
  "Other"
];
export const billCategories = ["Mortgage", "Utilities", "Insurance", "School", "Subscriptions", "Medical", "Vehicle", "Other"];
export const financeTypes = ["Cash", "Credit", "Insurance", "Loan", "Subscription", "Investment"];
export const healthTypes = ["Provider", "Insurance", "Medication", "Allergy", "Condition", "Appointment", "Immunization", "Pharmacy"];
export const homeCategories = [
  "Maintenance",
  "Vendor",
  "Warranty",
  "Appliance",
  "Filter",
  "HVAC",
  "Lawn",
  "Pest",
  "Repair",
  "Project",
  "Seasonal"
];
export const documentCategories = [
  "Identity",
  "Insurance",
  "Medical",
  "School",
  "Home",
  "Vehicle",
  "Financial",
  "Legal",
  "Travel",
  "Taxes",
  "Other"
];
export const contactCategories = [
  "Family",
  "Emergency",
  "Doctor",
  "School",
  "Neighbor",
  "Contractor",
  "Financial",
  "Insurance",
  "Other"
];
export const communicationCategories = ["Important", "Schedule", "School", "Health", "Home", "Money", "Reminder", "Decision"];
export const relationshipCategories = [
  "Daily Connection",
  "Stress",
  "Conflict",
  "Attachment",
  "Fairness",
  "Intimacy",
  "Shared Meaning",
  "Repair",
  "Check-In"
] as const;
export const relationshipPractices = [
  "Stress-reducing conversation",
  "Six-second kiss",
  "Hug until relaxed",
  "Daily appreciation",
  "Bids for connection",
  "5:1 ratio",
  "Weekly state of the union",
  "Soft startup",
  "Repair attempt",
  "A.R.E. check",
  "Cycle map",
  "Full-respect living",
  "Couple bubble",
  "Desire brakes check"
] as const;
export const relationshipCycles = [
  "None",
  "Find the Bad Guy",
  "Protest Polka",
  "Freeze and Flee",
  "Anxious-avoidant trap",
  "Pursue-withdraw",
  "Flooding"
] as const;
export const activityCategories = [
  "Outdoor",
  "Creative",
  "Learning",
  "Sports",
  "Food",
  "Service",
  "Adventure",
  "At Home",
  "Seasonal",
  "Date Night"
] as const;
export const activitySeasons = ["Anytime", "Spring", "Summer", "Fall", "Winter", "Rainy Day"] as const;
export const emergencyCategories = [
  "Emergency Contact",
  "Meeting Location",
  "Medical Summary",
  "Insurance Reference",
  "Kids Pickup",
  "Home Shutoff",
  "Pet Plan",
  "Disaster Supplies"
];
export const goalCategories = ["Financial", "Health", "Home", "Family", "Travel", "Education", "Spiritual or Personal"];

export const notificationKinds = [
  "due_soon",
  "overdue",
  "communication_note",
  "assigned_task",
  "upcoming_event",
  "upcoming_bill",
  "upcoming_appointment"
] as const;
