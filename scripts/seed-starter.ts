import { createClient } from "@supabase/supabase-js";
import { createSeedData } from "@/lib/seed-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const data = createSeedData();
const seedUserId = process.env.SEED_USER_ID;

if (seedUserId) {
  data.family_members[0].user_id = seedUserId;
}

const tableOrder = [
  "families",
  "family_members",
  "events",
  "tasks",
  "grocery_items",
  "meal_plans",
  "financial_accounts",
  "budget_settings",
  "budget_categories",
  "financial_transactions",
  "credit_cards",
  "sinking_funds",
  "bills",
  "health_records",
  "school_records",
  "home_records",
  "vehicle_records",
  "documents",
  "contacts",
  "communication_notes",
  "relationship_records",
  "activity_ideas",
  "calendar_connections",
  "emergency_plan_items",
  "family_goals",
  "notifications",
  "activity_log"
] as const;

async function main() {
  for (const table of tableOrder) {
    const rows = data[table];
    if (rows.length === 0) continue;
    const { error } = await supabase.from(table).upsert(rows as never, { onConflict: "id" });
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`Seeded ${rows.length} rows into ${table}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
