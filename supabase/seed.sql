insert into public.families (id, name)
values ('family_rivera_demo', 'Rivera Family')
on conflict (id) do update set name = excluded.name;

insert into public.family_members (id, family_id, user_id, display_name, role, phone, email, relationship)
values
  ('member_ava_rivera', 'family_rivera_demo', null, 'Ava Rivera', 'admin', '555-0101', 'ava.rivera@example.test', 'Mom'),
  ('member_miles_rivera', 'family_rivera_demo', null, 'Miles Rivera', 'parent', '555-0102', 'miles.rivera@example.test', 'Dad'),
  ('member_lily_rivera', 'family_rivera_demo', null, 'Lily Rivera', 'viewer', null, null, 'Child'),
  ('member_noah_rivera', 'family_rivera_demo', null, 'Noah Rivera', 'viewer', null, null, 'Child')
on conflict (id) do nothing;

insert into public.events (id, family_id, title, description, category, location, start_at, end_at, all_day, recurrence_rule, assigned_to, created_by)
values
  ('event_family_dinner', 'family_rivera_demo', 'Family dinner', 'Grandma is bringing dessert.', 'Family', 'Home', now() + interval '6 hours', now() + interval '7 hours 30 minutes', false, 'Weekly on Tuesday', null, 'member_ava_rivera'),
  ('event_lily_conference', 'family_rivera_demo', 'Lily parent-teacher conference', 'Bring reading folder and math packet.', 'School', 'Northview Elementary', now() + interval '2 days 15 hours', now() + interval '2 days 16 hours', false, null, 'member_lily_rivera', 'member_ava_rivera'),
  ('event_noah_checkup', 'family_rivera_demo', 'Noah annual checkup', 'Confirm sports physical form.', 'Medical', 'Harbor Pediatrics', now() + interval '6 days 9 hours', now() + interval '6 days 10 hours', false, null, 'member_noah_rivera', 'member_miles_rivera')
on conflict (id) do nothing;

insert into public.tasks (id, family_id, title, description, category, priority, status, assigned_to, due_at, repeat_rule, created_by, tags, notes)
values
  ('task_permission_slip', 'family_rivera_demo', 'Sign Lily field trip permission slip', 'Return the form in Friday folder.', 'School', 'urgent', 'in_progress', 'member_ava_rivera', now() - interval '1 day', null, 'member_miles_rivera', array['school', 'paperwork'], 'Check the backpack front pocket.'),
  ('task_hvac_filter', 'family_rivera_demo', 'Replace HVAC filter', 'Use 20x25x1 filter from garage shelf.', 'Home', 'medium', 'not_started', 'member_miles_rivera', now() + interval '3 days', 'Every 90 days', 'member_ava_rivera', array['maintenance'], null)
on conflict (id) do nothing;

insert into public.grocery_items (id, family_id, name, category, quantity, unit, store, needed_by, checked, added_by)
values
  ('grocery_apples', 'family_rivera_demo', 'Honeycrisp apples', 'Produce', '6', 'each', 'Market Basket', current_date + 1, false, 'member_ava_rivera'),
  ('grocery_milk', 'family_rivera_demo', 'Whole milk', 'Dairy', '1', 'gallon', 'Market Basket', current_date, false, 'member_miles_rivera'),
  ('grocery_filters', 'family_rivera_demo', 'HVAC filters 20x25x1', 'Household', '2', 'pack', 'Home Supply', current_date + 3, false, 'member_miles_rivera')
on conflict (id) do nothing;

insert into public.meal_plans (id, family_id, meal_date, meal_type, title, recipe_url, ingredients, notes)
values
  ('meal_taco_bowls', 'family_rivera_demo', current_date + 1, 'Dinner', 'Turkey taco bowls', 'https://example.com/turkey-taco-bowls', 'Ground turkey, rice, black beans, peppers, avocado, salsa', 'Make extra rice for lunches.'),
  ('meal_oatmeal', 'family_rivera_demo', current_date + 2, 'Breakfast', 'Overnight oats', null, 'Oats, milk, berries, chia seeds', 'Prep two jars the night before.')
on conflict (id) do nothing;

insert into public.financial_accounts (id, family_id, institution_name, account_type, owner_name, last_four, website_url, support_phone, renewal_date, password_location, notes)
values
  ('finance_checking', 'family_rivera_demo', 'Harbor Credit Union', 'Cash', 'Ava and Miles', '2481', 'https://example.com', '555-0150', current_date + 90, '1Password Family Vault', 'Primary household checking.'),
  ('finance_card', 'family_rivera_demo', 'Summit Rewards', 'Credit', 'Miles', '7712', 'https://example.com', '555-0151', current_date + 45, '1Password Family Vault', 'Used for groceries and gas.')
on conflict (id) do nothing;

insert into public.budget_settings (
  id,
  family_id,
  budget_year,
  budget_month,
  starting_cash_available,
  planned_monthly_income,
  include_prior_category_balances,
  payoff_strategy,
  target_utilization,
  excellent_utilization,
  high_utilization_alert,
  notes
)
values (
  'budget_settings_current',
  'family_rivera_demo',
  extract(year from current_date)::integer,
  date_trunc('month', current_date)::date,
  1500.00,
  6500.00,
  true,
  'avalanche',
  0.30,
  0.10,
  0.50,
  'Demo values based on the workbook setup tab. Replace with household assumptions.'
)
on conflict (id) do nothing;

insert into public.budget_categories (
  id,
  family_id,
  budget_month,
  group_name,
  category,
  need_want_goal,
  monthly_plan,
  rollover,
  prior_balance,
  notes
)
values
  ('budget_category_rent', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Housing', 'Rent / Mortgage', 'need', 2500.00, false, 0.00, null),
  ('budget_category_home_maintenance', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Housing', 'Home Maintenance', 'need', 150.00, true, 200.00, 'Roll unused maintenance dollars forward.'),
  ('budget_category_electricity', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Utilities', 'Electricity', 'need', 180.00, false, 0.00, null),
  ('budget_category_internet', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Utilities', 'Internet', 'need', 85.00, false, 0.00, null),
  ('budget_category_phone', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Utilities', 'Phone', 'need', 120.00, false, 0.00, null),
  ('budget_category_car_payment', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Transportation', 'Car Payment', 'need', 450.00, false, 0.00, null),
  ('budget_category_fuel', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Transportation', 'Fuel', 'need', 220.00, false, 0.00, null),
  ('budget_category_groceries', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Food', 'Groceries', 'need', 850.00, false, 0.00, null),
  ('budget_category_restaurants', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Food', 'Restaurants', 'want', 260.00, false, 0.00, null),
  ('budget_category_school', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Kids', 'School', 'need', 160.00, true, 75.00, 'Forms, activity fees, and classroom supplies.'),
  ('budget_category_medical', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Health', 'Medical', 'need', 175.00, true, 100.00, null),
  ('budget_category_credit_payment', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Debt', 'Credit Card Payment', 'goal', 700.00, false, 0.00, 'Includes minimums plus extra principal.'),
  ('budget_category_emergency_fund', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Savings', 'Emergency Fund', 'goal', 500.00, true, 3500.00, null),
  ('budget_category_streaming', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Lifestyle', 'Streaming', 'want', 25.00, false, 0.00, null)
on conflict (id) do nothing;

insert into public.financial_transactions (
  id,
  family_id,
  transaction_date,
  account_name,
  transaction_type,
  category,
  description,
  amount,
  cleared,
  recurring,
  owner_name,
  notes,
  tags,
  created_by
)
values
  ('transaction_paycheck_1', 'family_rivera_demo', date_trunc('month', current_date)::date, 'Checking', 'income', 'Paycheck', 'Sample paycheck', 3250.00, true, false, 'Household', null, array['income'], 'member_ava_rivera'),
  ('transaction_rent', 'family_rivera_demo', date_trunc('month', current_date)::date + 2, 'Checking', 'expense', 'Rent / Mortgage', 'Sample housing payment', 2500.00, true, true, 'Household', null, array['housing'], 'member_miles_rivera'),
  ('transaction_groceries', 'family_rivera_demo', date_trunc('month', current_date)::date + 3, 'Main Visa', 'expense', 'Groceries', 'Sample grocery trip', 185.42, true, false, 'Household', null, array['food'], 'member_ava_rivera'),
  ('transaction_fuel', 'family_rivera_demo', date_trunc('month', current_date)::date + 4, 'Main Visa', 'expense', 'Fuel', 'Sample fuel', 64.20, true, false, 'Household', null, array['vehicle'], 'member_miles_rivera'),
  ('transaction_internet', 'family_rivera_demo', date_trunc('month', current_date)::date + 5, 'Checking', 'expense', 'Internet', 'Sample internet bill', 85.00, true, true, 'Household', null, array['utilities'], 'member_ava_rivera'),
  ('transaction_streaming', 'family_rivera_demo', date_trunc('month', current_date)::date + 7, 'Main Visa', 'expense', 'Streaming', 'Streaming bundle', 24.99, true, true, 'Household', null, array['subscription'], 'member_ava_rivera')
on conflict (id) do nothing;

insert into public.credit_cards (
  id,
  family_id,
  card_name,
  issuer,
  owner_name,
  last_four,
  current_balance,
  credit_limit,
  apr,
  minimum_payment,
  extra_payment,
  statement_day,
  due_day,
  due_date,
  autopay,
  payment_account,
  password_location,
  notes
)
values
  ('credit_card_main_visa', 'family_rivera_demo', 'Main Visa', 'Example Bank', 'Household', '7712', 4200.00, 10000.00, 0.21990, 140.00, 260.00, 5, 22, date_trunc('month', current_date)::date + 21, true, 'Checking', '1Password Family Vault', 'Sample card record. Replace with real last four only.'),
  ('credit_card_rewards_mastercard', 'family_rivera_demo', 'Rewards Mastercard', 'Example Credit Union', 'Household', '3855', 1800.00, 6000.00, 0.18990, 65.00, 135.00, 10, 25, date_trunc('month', current_date)::date + 24, true, 'Checking', '1Password Family Vault', 'Used for rotating rewards categories.'),
  ('credit_card_store', 'family_rivera_demo', 'Store Card', 'Example Store', 'Household', '1048', 650.00, 1500.00, 0.29990, 40.00, 60.00, 18, 12, date_trunc('month', current_date)::date + 11, false, 'Checking', '1Password Family Vault', 'High APR. Avalanche plan prioritizes this card.')
on conflict (id) do nothing;

insert into public.sinking_funds (id, family_id, goal, category, target_amount, target_date, saved_so_far, planned_monthly, notes)
values
  ('sinking_emergency_fund', 'family_rivera_demo', 'Emergency Fund', 'Financial', 10000.00, current_date + 360, 3500.00, 500.00, 'Primary cash buffer.'),
  ('sinking_vacation', 'family_rivera_demo', 'Vacation', 'Travel', 3000.00, current_date + 270, 600.00, 250.00, 'Summer family trip.'),
  ('sinking_home_repairs', 'family_rivera_demo', 'Home Repairs', 'Home', 2500.00, current_date + 210, 450.00, 150.00, 'Repairs that should not hit the credit card.'),
  ('sinking_holiday_gifts', 'family_rivera_demo', 'Holiday Gifts', 'Family', 1200.00, current_date + 90, 300.00, 300.00, 'Gift budget and seasonal expenses.'),
  ('sinking_car_maintenance', 'family_rivera_demo', 'Car Maintenance', 'Home', 1000.00, current_date + 150, 250.00, 125.00, 'Oil changes, tires, and small repairs.')
on conflict (id) do nothing;

insert into public.bills (id, family_id, name, category, amount, due_day, due_date, autopay, payment_account, status, notes)
values
  ('bill_mortgage', 'family_rivera_demo', 'Mortgage', 'Mortgage', 2150.00, 1, current_date + 4, true, 'Checking ending 2481', 'upcoming', 'Autopay confirmation usually arrives two days before due date.'),
  ('bill_soccer', 'family_rivera_demo', 'Noah soccer registration', 'School', 95.00, null, current_date - 2, false, 'Checking', 'overdue', 'Pay before roster closes.')
on conflict (id) do nothing;

insert into public.health_records (id, family_id, person_id, record_type, provider_name, provider_phone, policy_provider, policy_last_four, medication_name, dosage, allergy, condition, appointment_date, notes)
values
  ('health_pediatrician', 'family_rivera_demo', 'member_noah_rivera', 'Provider', 'Harbor Pediatrics', '555-0201', 'Example Health', '4408', null, null, null, null, now() + interval '6 days 9 hours', 'Annual wellness visit and sports physical form.'),
  ('health_lily_allergy', 'family_rivera_demo', 'member_lily_rivera', 'Allergy', null, null, null, null, 'Cetirizine', 'Children''s dose as directed by clinician', 'Seasonal pollen', null, null, 'Keep allergy note in school backpack during spring.')
on conflict (id) do nothing;

insert into public.school_records (id, family_id, child_id, school_name, grade, teacher_name, teacher_email, school_phone, pickup_notes, activities, important_dates, notes)
values
  ('school_lily', 'family_rivera_demo', 'member_lily_rivera', 'Northview Elementary', '3rd', 'Ms. Parker', 'teacher.parker@example.test', '555-0301', 'Grandma Elena is authorized for pickup on Wednesdays.', 'Art club, reading group', 'Conference and field trip this month.', 'Check Friday folder each weekend.'),
  ('school_noah', 'family_rivera_demo', 'member_noah_rivera', 'Brookside Middle', '6th', 'Mr. Chen', 'teacher.chen@example.test', '555-0302', 'Bus route 14 most days.', 'Soccer, robotics', 'Science fair proposal due soon.', 'Needs graph paper for math lab.')
on conflict (id) do nothing;

insert into public.home_records (id, family_id, category, title, vendor_name, vendor_phone, warranty_expiration, maintenance_due, location, notes)
values
  ('home_hvac', 'family_rivera_demo', 'HVAC', 'Replace HVAC filter', 'Cool Air Service', '555-0401', current_date + 220, current_date + 3, 'Hall closet intake', '20x25x1 filters stored in garage.'),
  ('home_water_heater', 'family_rivera_demo', 'Appliance', 'Water heater flush', 'Oak Plumbing', '555-0402', current_date + 600, current_date + 30, 'Garage', 'Annual flush recommended.')
on conflict (id) do nothing;

insert into public.vehicle_records (id, family_id, vehicle_name, vin_last_six, plate, insurance_provider, policy_last_four, registration_due, maintenance_due, mileage, notes)
values
  ('vehicle_van', 'family_rivera_demo', 'Family minivan', '7H2K91', 'FAM-204', 'Example Mutual', '1904', current_date + 70, current_date + 14, 68240, 'Oil change and tire rotation due soon.'),
  ('vehicle_sedan', 'family_rivera_demo', 'Commuter sedan', '92PLQ8', 'CITY-88', 'Example Mutual', '1904', current_date + 140, current_date + 45, 42120, 'Wiper blades replaced last month.')
on conflict (id) do nothing;

insert into public.documents (id, family_id, title, category, file_url, storage_location, renewal_date, owner, notes)
values
  ('doc_insurance_cards', 'family_rivera_demo', 'Health insurance card copies', 'Insurance', null, 'Family Drive / Insurance / Current Cards', current_date + 180, 'Ava', 'Upload copies after Supabase Storage is configured.'),
  ('doc_school_forms', 'family_rivera_demo', 'School forms folder', 'School', null, 'Kitchen command drawer', current_date + 60, 'Miles', 'Contains field trip and sports forms.')
on conflict (id) do nothing;

insert into public.contacts (id, family_id, name, relationship, category, phone, email, address, notes, emergency_contact)
values
  ('contact_elena', 'family_rivera_demo', 'Elena Rivera', 'Grandparent', 'Emergency', '555-0501', 'elena@example.test', '12 Maple Street', 'Authorized school pickup.', true),
  ('contact_pediatrician', 'family_rivera_demo', 'Harbor Pediatrics', 'Pediatrician', 'Doctor', '555-0201', 'frontdesk@example.test', '100 Harbor Way', 'After-hours nurse line available.', false)
on conflict (id) do nothing;

insert into public.communication_notes (id, family_id, title, message, category, importance, related_date, visible_to, acknowledged_by, created_by, pinned)
values
  ('note_backpack', 'family_rivera_demo', 'Check Lily''s backpack', 'The field trip form and lunch choice sheet are both in the front pocket.', 'School', 'high', current_date, 'member_miles_rivera', '{}', 'member_ava_rivera', true),
  ('note_budget', 'family_rivera_demo', 'Budget chat', 'Look at summer camp costs after dinner on Thursday.', 'Money', 'medium', current_date + 2, null, array['member_miles_rivera'], 'member_miles_rivera', false)
on conflict (id) do nothing;

insert into public.relationship_records (
  id,
  family_id,
  title,
  category,
  practice,
  priority,
  status,
  assigned_to,
  due_at,
  connection_score,
  partner_a_state,
  partner_b_state,
  positive_interactions,
  negative_interactions,
  cycle_name,
  repair_attempt,
  next_step,
  notes,
  tags,
  created_by
)
values
  (
    'relationship_stress_conversation',
    'family_rivera_demo',
    'Daily stress-reducing conversation',
    'Stress',
    'Stress-reducing conversation',
    'high',
    'in_progress',
    'member_ava_rivera',
    now() + interval '20 hours',
    7,
    'Carrying work pressure and needs listening without solutions.',
    'Needs to feel like an ally, not the fixer.',
    6,
    1,
    'None',
    'Ask first: do you want empathy or help?',
    'Take 20 minutes after kids are down. Outside stress only.',
    'Listener takes partner''s side and reflects back what they heard.',
    array['gottman', 'stress'],
    'member_ava_rivera'
  ),
  (
    'relationship_weekly_union',
    'family_rivera_demo',
    'Weekly state of the union',
    'Check-In',
    'Weekly state of the union',
    'medium',
    'not_started',
    'member_miles_rivera',
    now() + interval '3 days 19 hours',
    6,
    'Wants a calmer way to raise logistics and fairness.',
    'Wants one topic at a time and clear requests.',
    5,
    1,
    'Protest Polka',
    'Start with appreciations and one issue only.',
    'Each bring one appreciation and one concrete request.',
    'Use soft startup: I feel X about Y, and I need Z.',
    array['gottman', 'check-in'],
    'member_miles_rivera'
  ),
  (
    'relationship_repair_budget',
    'family_rivera_demo',
    'Repair after budget tension',
    'Repair',
    'Repair attempt',
    'high',
    'waiting',
    'member_ava_rivera',
    now() + interval '1 day 12 hours',
    5,
    'Felt alone holding camp-cost planning.',
    'Felt criticized and got defensive.',
    3,
    2,
    'Find the Bad Guy',
    'Can we restart? I want to understand your pressure before we solve it.',
    'Name shared goal before numbers: summer plan without resentment.',
    'Watch for defensiveness and switch to responsibility-taking.',
    array['repair', 'money'],
    'member_ava_rivera'
  )
on conflict (id) do nothing;

insert into public.activity_ideas (
  id,
  family_id,
  title,
  category,
  audience,
  description,
  location,
  estimated_cost,
  duration_minutes,
  season,
  indoor,
  supplies,
  status,
  scheduled_event_id,
  assigned_to,
  notes,
  created_by
)
values
  (
    'activity_son_skill_hour',
    'family_rivera_demo',
    'Saturday skill hour with Noah',
    'At Home',
    'son',
    'Let Noah pick one practical skill to learn together, then end with a snack.',
    'Home',
    10,
    75,
    'Anytime',
    true,
    'Simple project supplies, snack, timer',
    'idea',
    null,
    'member_noah_rivera',
    'Good for a low-pressure one-on-one morning.',
    'member_miles_rivera'
  ),
  (
    'activity_daughter_art_date',
    'family_rivera_demo',
    'Lily art and cocoa date',
    'Creative',
    'daughter',
    'Bring sketchbooks to the neighborhood cafe and draw together.',
    'Neighborhood cafe',
    18,
    90,
    'Rainy Day',
    true,
    'Sketchbooks, pencils',
    'idea',
    null,
    'member_lily_rivera',
    'Let Lily choose the drawing prompt.',
    'member_ava_rivera'
  ),
  (
    'activity_date_bookstore',
    'family_rivera_demo',
    'Bookstore date night',
    'Date Night',
    'date_night',
    'Each person picks one book the other might like, then compare choices over dessert.',
    'Downtown bookstore',
    45,
    150,
    'Anytime',
    true,
    'Babysitter confirmed, dinner reservation optional',
    'idea',
    null,
    null,
    'Protect this from logistics talk for the first hour.',
    'member_miles_rivera'
  )
on conflict (id) do nothing;

insert into public.calendar_connections (
  id,
  family_id,
  provider,
  calendar_name,
  sync_direction,
  sync_status,
  feed_url,
  external_calendar_id,
  include_events,
  include_tasks,
  include_bills,
  include_appointments,
  last_synced_at,
  notes
)
values
  (
    'calendar_google_family',
    'family_rivera_demo',
    'google',
    'Rivera Family Google Calendar',
    'export',
    'setup_required',
    null,
    null,
    true,
    true,
    true,
    true,
    null,
    'Use Export ICS now. Add OAuth credentials later for automated Google Calendar sync.'
  ),
  (
    'calendar_apple_family',
    'family_rivera_demo',
    'apple',
    'Rivera Family Apple Calendar',
    'import',
    'setup_required',
    null,
    null,
    true,
    false,
    false,
    true,
    null,
    'Import the generated ICS file into Apple Calendar or subscribe to a hosted webcal feed.'
  )
on conflict (id) do nothing;

insert into public.emergency_plan_items (id, family_id, category, title, details, location, contact_name, contact_phone, priority)
values
  ('emergency_meeting', 'family_rivera_demo', 'Meeting Location', 'Neighborhood meeting spot', 'Meet by the large sign at the community pool if home is not accessible.', 'Community pool entrance', null, null, 'high'),
  ('emergency_water', 'family_rivera_demo', 'Home Shutoff', 'Main water shutoff', 'Blue handle behind the garage utility panel.', 'Garage', 'Oak Plumbing', '555-0402', 'urgent')
on conflict (id) do nothing;

insert into public.family_goals (id, family_id, title, category, target_date, progress, status, notes)
values
  ('goal_emergency_fund', 'family_rivera_demo', 'Build emergency fund', 'Financial', current_date + 180, 64, 'in_progress', 'Automated monthly transfer is active.'),
  ('goal_family_hike', 'family_rivera_demo', 'Monthly family hike', 'Family', current_date + 30, 40, 'in_progress', 'Pick next trail by Friday.')
on conflict (id) do nothing;

insert into public.notifications (id, family_id, kind, title, body, entity_type, entity_id)
values
  ('notif_overdue_task', 'family_rivera_demo', 'overdue', 'Permission slip is overdue', 'Sign Lily''s field trip form today.', 'tasks', 'task_permission_slip'),
  ('notif_bill_due', 'family_rivera_demo', 'upcoming_bill', 'Mortgage due soon', 'Autopay is scheduled.', 'bills', 'bill_mortgage')
on conflict (id) do nothing;
