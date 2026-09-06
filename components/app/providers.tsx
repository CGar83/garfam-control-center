"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";
import { createSeedData, localUser } from "@/lib/seed-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ActivityLog,
  CalendarConnection,
  CurrentUser,
  DataStore,
  FamilyMember,
  NotificationRecord,
  TableName,
  TableRecord
} from "@/lib/types";
import { makeId, nowIso, recordMap } from "@/lib/utils";

type EditableTable = Exclude<TableName, "families" | "activity_log">;

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function emptyDataStore(): DataStore {
  return {
    families: [],
    family_members: [],
    events: [],
    tasks: [],
    grocery_items: [],
    meal_plans: [],
    financial_accounts: [],
    budget_settings: [],
    budget_categories: [],
    financial_transactions: [],
    credit_cards: [],
    sinking_funds: [],
    bills: [],
    health_records: [],
    school_records: [],
    home_records: [],
    vehicle_records: [],
    documents: [],
    contacts: [],
    communication_notes: [],
    relationship_records: [],
    activity_ideas: [],
    calendar_connections: [],
    emergency_plan_items: [],
    family_goals: [],
    notifications: [],
    activity_log: []
  };
}

function normalizeFamilyMember(member: FamilyMember): FamilyMember {
  return {
    ...member,
    birthdate: member.birthdate ?? null,
    age_label: member.age_label ?? null,
    blocked_sections: member.blocked_sections ?? []
  };
}

function normalizeCalendarConnection(connection: CalendarConnection): CalendarConnection {
  return {
    ...connection,
    embed_url: connection.embed_url ?? null,
    embed_enabled: connection.embed_enabled ?? false,
    embed_height: connection.embed_height ?? 640
  };
}

function normalizeDataStore(store: Partial<DataStore>): DataStore {
  const seeded = createSeedData();

  return {
    ...seeded,
    ...store,
    families: store.families?.length ? store.families : seeded.families,
    family_members: (store.family_members?.length ? store.family_members : seeded.family_members).map(normalizeFamilyMember),
    relationship_records: store.relationship_records ?? seeded.relationship_records,
    calendar_connections: (store.calendar_connections ?? seeded.calendar_connections).map(normalizeCalendarConnection)
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (nextToast: Omit<Toast, "id">) => {
      const id = makeId("toast");
      setToasts((current) => [...current, { ...nextToast, id }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toasts, toast, dismiss }), [dismiss, toast, toasts]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

interface PrivacyContextValue {
  privacyMode: boolean;
  setPrivacyMode: (enabled: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [privacyMode, setPrivacyModeState] = useState(false);

  useEffect(() => {
    setPrivacyModeState(localStorage.getItem("family-control-privacy") === "true");
  }, []);

  const setPrivacyMode = useCallback((enabled: boolean) => {
    setPrivacyModeState(enabled);
    localStorage.setItem("family-control-privacy", String(enabled));
  }, []);

  const value = useMemo(() => ({ privacyMode, setPrivacyMode }), [privacyMode, setPrivacyMode]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacyContext() {
  const context = useContext(PrivacyContext);
  if (!context) throw new Error("usePrivacyMode must be used inside PrivacyProvider");
  return context;
}

interface ThemeContextValue {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("family-control-theme") as "light" | "dark" | null;
    const nextTheme = saved ?? "light";
    setThemeState(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  const setTheme = useCallback((nextTheme: "light" | "dark") => {
    setThemeState(nextTheme);
    localStorage.setItem("family-control-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}

interface AppDataContextValue {
  data: DataStore;
  currentUser: CurrentUser;
  currentMember: FamilyMember | null;
  currentMemberId: string | null;
  familyId: string;
  supabase: SupabaseClient | null;
  supabaseConfigured: boolean;
  usingLocalData: boolean;
  loading: boolean;
  createWorkspace: (name: string) => Promise<void>;
  updateFamilyName: (name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  createRecord: <TTable extends EditableTable>(table: TTable, values: Partial<TableRecord<TTable>>) => Promise<TableRecord<TTable>>;
  updateRecord: <TTable extends EditableTable>(
    table: TTable,
    id: string,
    values: Partial<TableRecord<TTable>>
  ) => Promise<TableRecord<TTable>>;
  deleteRecord: <TTable extends EditableTable>(table: TTable, id: string) => Promise<void>;
  applyRealtimeChange: <TTable extends EditableTable>(
    table: TTable,
    eventType: "INSERT" | "UPDATE" | "DELETE",
    newRecord?: Partial<TableRecord<TTable>> | null,
    oldRecord?: Partial<TableRecord<TTable>> | null
  ) => void;
  clearCheckedGroceries: () => Promise<void>;
  addIngredientsToGrocery: (ingredients: string, store?: string | null) => Promise<void>;
  restoreStarterData: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);
const storageKey = "family-control-center-local-store";

type AuthActionResult = {
  status: "signed_in" | "confirmation_required" | "local";
  message: string;
};

const syncTables: EditableTable[] = [
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
  "notifications"
];

function recordTitle(record: unknown) {
  const rec = recordMap(record);
  return String(
    rec.title ??
      rec.name ??
      rec.institution_name ??
      rec.card_name ??
      rec.goal ??
      rec.description ??
      rec.budget_month ??
      rec.provider_name ??
      rec.school_name ??
      rec.vehicle_name ??
      rec.display_name ??
      rec.category ??
      "Untitled"
  );
}

function authDisplayName(user: User) {
  const metadataName = user.user_metadata?.display_name;
  return typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : user.email?.split("@")[0] || "Family user";
}

function browserIsOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}

function assertCanSync(usingLocalData: boolean) {
  if (!usingLocalData && !browserIsOnline()) {
    throw new Error("You are offline. Reconnect before saving production family data.");
  }
}

function memberForUser(store: DataStore, userId: string, memberId?: string | null) {
  return (
    store.family_members.find((member) => member.id === memberId) ??
    store.family_members.find((member) => member.user_id === userId) ??
    store.family_members[0] ??
    null
  );
}

function userFromAuth(user: User, member?: FamilyMember | null): CurrentUser {
  return {
    id: user.id,
    member_id: member?.id ?? null,
    email: user.email ?? "unknown@example.test",
    display_name: member?.display_name ?? authDisplayName(user),
    role: member?.role ?? "admin",
    blocked_sections: member?.blocked_sections ?? []
  };
}

async function createRemoteWorkspace(supabase: SupabaseClient, user: User, name?: string) {
  const timestamp = nowIso();
  const workspace = {
    id: makeId("family"),
    name: name?.trim() || `${authDisplayName(user)} Family`,
    created_at: timestamp,
    updated_at: timestamp
  };
  const member: FamilyMember = {
    id: makeId("member"),
    family_id: workspace.id,
    user_id: user.id,
    display_name: authDisplayName(user),
    role: "admin",
    avatar_url: null,
    phone: null,
    email: user.email ?? null,
    relationship: "Parent",
    birthdate: null,
    age_label: "Adult",
    blocked_sections: [],
    created_at: timestamp,
    updated_at: timestamp
  };

  const { error: familyError } = await supabase.from("families").insert(workspace);
  if (familyError) throw familyError;
  const { error: memberError } = await supabase.from("family_members").insert(member);
  if (memberError) throw memberError;

  return {
    store: { ...emptyDataStore(), families: [workspace], family_members: [member] },
    user: userFromAuth(user, member)
  };
}

function notificationSeed(table: EditableTable, record: Record<string, unknown>): Pick<
  NotificationRecord,
  "kind" | "title" | "body" | "entity_type" | "entity_id"
> | null {
  const title = recordTitle(record);

  if (table === "tasks" && record.status !== "done") {
    return {
      kind: "assigned_task",
      title: `New task: ${title}`,
      body: record.due_at ? "A task has been added with a due date." : "A task has been added.",
      entity_type: table,
      entity_id: String(record.id)
    };
  }

  if (table === "communication_notes") {
    return {
      kind: "communication_note",
      title: `New note: ${title}`,
      body: typeof record.message === "string" ? record.message.slice(0, 180) : "A communication note was added.",
      entity_type: table,
      entity_id: String(record.id)
    };
  }

  if (table === "events") {
    return {
      kind: "upcoming_event",
      title: `New event: ${title}`,
      body: typeof record.start_at === "string" ? "A calendar event was added." : null,
      entity_type: table,
      entity_id: String(record.id)
    };
  }

  if (table === "bills") {
    return {
      kind: "upcoming_bill",
      title: `Bill added: ${title}`,
      body: record.due_date ? "A bill was added to the family bill calendar." : "A bill was added.",
      entity_type: table,
      entity_id: String(record.id)
    };
  }

  if (table === "health_records" && record.appointment_date) {
    return {
      kind: "upcoming_appointment",
      title: `Appointment added: ${title}`,
      body: "A health appointment was added.",
      entity_type: table,
      entity_id: String(record.id)
    };
  }

  if (table === "activity_ideas" && record.status === "planned") {
    return {
      kind: "upcoming_event",
      title: `Activity planned: ${title}`,
      body: "An activity idea was moved into planning.",
      entity_type: table,
      entity_id: String(record.id)
    };
  }

  return null;
}

async function loadSupabaseData(supabase: SupabaseClient): Promise<DataStore | null> {
  const { data: memberships, error: membershipError } = await supabase.from("family_members").select("*").order("created_at");
  if (membershipError || !memberships?.length) return null;

  const familyId = memberships[0].family_id as string;
  const [{ data: families }, ...tableResponses] = await Promise.all([
    supabase.from("families").select("*").eq("id", familyId),
    ...syncTables.map((table) => supabase.from(table).select("*").eq("family_id", familyId).order("created_at"))
  ]);

  const nextData = emptyDataStore();
  nextData.families = families ?? [];
  nextData.family_members = (memberships as FamilyMember[]).map(normalizeFamilyMember);

  tableResponses.forEach((response, index) => {
    const table = syncTables[index];
    const records = response.data ?? [];
    nextData[table] = (table === "calendar_connections" ? records.map(normalizeCalendarConnection) : records) as never;
  });

  const { data: activity } = await supabase.from("activity_log").select("*").eq("family_id", familyId).order("created_at");
  nextData.activity_log = activity ?? [];

  return nextData;
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [data, setData] = useState<DataStore>(() => createSeedData());
  const [currentUser, setCurrentUser] = useState<CurrentUser>(localUser);
  const [loading, setLoading] = useState(true);
  const [usingLocalData, setUsingLocalData] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const familyId = data.families[0]?.id ?? "family_local";
  const currentMember = useMemo(() => memberForUser(data, currentUser.id, currentUser.member_id), [currentUser.id, currentUser.member_id, data]);
  const currentMemberId = currentMember?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          const user = sessionData.session.user;
          try {
            const remoteData = await loadSupabaseData(supabase);
            if (!cancelled && remoteData) {
              const member = memberForUser(remoteData, user.id);
              setCurrentUser(userFromAuth(user, member));
              setData(remoteData);
              setUsingLocalData(false);
              setHydrated(true);
              setLoading(false);
              return;
            }

            const bootstrapped = await createRemoteWorkspace(supabase, user);
            if (!cancelled) {
              setCurrentUser(bootstrapped.user);
              setData(bootstrapped.store);
              setUsingLocalData(false);
              setHydrated(true);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.warn("Supabase workspace load failed; falling back to local workspace data.", error);
          }
        }
      }

      const saved = localStorage.getItem(storageKey);
      if (!cancelled && saved) {
        setData(normalizeDataStore(JSON.parse(saved) as Partial<DataStore>));
      }

      if (!cancelled) {
        setUsingLocalData(true);
        setHydrated(true);
        setLoading(false);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (hydrated && usingLocalData) {
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }, [data, hydrated, usingLocalData]);

  const createWorkspace = useCallback(
    async (name: string) => {
      if (supabase && !usingLocalData) {
        assertCanSync(usingLocalData);
        const { data: authData, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!authData.user) throw new Error("Sign in before creating a Supabase workspace.");
        const bootstrapped = await createRemoteWorkspace(supabase, authData.user, name);
        setCurrentUser(bootstrapped.user);
        setData(bootstrapped.store);
        return;
      }

      const timestamp = nowIso();
      const workspace = {
        id: makeId("family"),
        name,
        created_at: timestamp,
        updated_at: timestamp
      };
      const member = {
        id: makeId("member"),
        family_id: workspace.id,
        user_id: currentUser.id,
        display_name: currentUser.display_name,
        role: "admin" as const,
        avatar_url: null,
        phone: null,
        email: currentUser.email,
        relationship: "Parent",
        birthdate: null,
        age_label: "Adult",
        blocked_sections: [],
        created_at: timestamp,
        updated_at: timestamp
      };

      setCurrentUser((user) => ({ ...user, member_id: member.id, role: "admin", blocked_sections: [] }));
      setData({ ...emptyDataStore(), families: [workspace], family_members: [member] });
    },
    [currentUser, supabase, usingLocalData]
  );

  const updateFamilyName = useCallback(
    async (name: string) => {
      const timestamp = nowIso();
      const family = data.families[0];
      if (!family) {
        await createWorkspace(name);
        return;
      }

      if (supabase && !usingLocalData) assertCanSync(usingLocalData);

      setData((current) => ({
        ...current,
        families: current.families.map((item) => (item.id === family.id ? { ...item, name, updated_at: timestamp } : item))
      }));

      if (supabase && !usingLocalData) {
        const { error } = await supabase.from("families").update({ name, updated_at: timestamp }).eq("id", family.id);
        if (error) throw error;
      }
    },
    [createWorkspace, data.families, supabase, usingLocalData]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        setCurrentUser({ ...localUser, email, display_name: email.split("@")[0] || localUser.display_name, blocked_sections: [] });
        setUsingLocalData(true);
        return {
          status: "local",
          message: "Local workspace mode is active. Add Supabase environment variables locally or use the deployed Netlify site for cloud sync."
        } satisfies AuthActionResult;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!authData.user) throw new Error("Supabase did not return a signed-in user.");
      const remoteData = await loadSupabaseData(supabase);
      if (remoteData) {
        const member = memberForUser(remoteData, authData.user.id);
        setCurrentUser(userFromAuth(authData.user, member));
        setData(remoteData);
        setUsingLocalData(false);
        return {
          status: "signed_in",
          message: "Remote family workspace loaded from Supabase."
        } satisfies AuthActionResult;
      }

      const bootstrapped = await createRemoteWorkspace(supabase, authData.user);
      setCurrentUser(bootstrapped.user);
      setData(bootstrapped.store);
      setUsingLocalData(false);
      return {
        status: "signed_in",
        message: "New Supabase family workspace created."
      } satisfies AuthActionResult;
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!supabase) {
        setCurrentUser({ id: makeId("user"), email, display_name: displayName, role: "admin", blocked_sections: [] });
        setUsingLocalData(true);
        return {
          status: "local",
          message: "Local workspace mode is active. The account was not created in Supabase."
        } satisfies AuthActionResult;
      }

      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } }
      });
      if (error) throw error;
      if (authData.session && authData.user) {
        const bootstrapped = await createRemoteWorkspace(supabase, authData.user, `${displayName} Family`);
        setCurrentUser(bootstrapped.user);
        setData(bootstrapped.store);
        setUsingLocalData(false);
        return {
          status: "signed_in",
          message: "Account created and remote family workspace started."
        } satisfies AuthActionResult;
      }

      return {
        status: "confirmation_required",
        message: "Check your email and confirm the account, then come back and sign in."
      } satisfies AuthActionResult;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(localUser);
    setData(createSeedData());
    setUsingLocalData(true);
  }, [supabase]);

  const appendActivity = useCallback(
    async (action: string, table: EditableTable, record: { id: string }) => {
      const entry: ActivityLog = {
        id: makeId("activity"),
        family_id: familyId,
        actor_id: currentMemberId,
        action,
        entity_type: table,
        entity_id: record.id,
        summary: `${action} ${table.replace(/_/g, " ")}: ${recordTitle(record)}`,
        created_at: nowIso()
      };

      setData((current) => ({
        ...current,
        activity_log: [entry, ...current.activity_log].slice(0, 100)
      }));

      if (supabase && !usingLocalData) {
        const { error } = await supabase.from("activity_log").insert(entry);
        if (error) console.warn("Activity log insert failed", error);
      }
    },
    [currentMemberId, familyId, supabase, usingLocalData]
  );

  const appendNotification = useCallback(
    async (seed: ReturnType<typeof notificationSeed>) => {
      if (!seed) return;
      const timestamp = nowIso();
      const notification: NotificationRecord = {
        ...seed,
        id: makeId("notification"),
        family_id: familyId,
        read_at: null,
        created_at: timestamp,
        updated_at: timestamp
      };

      setData((current) => ({
        ...current,
        notifications: [notification, ...current.notifications].slice(0, 100)
      }));

      if (supabase && !usingLocalData) {
        const { error } = await supabase.from("notifications").insert(notification);
        if (error) console.warn("Notification insert failed", error);
      }
    },
    [familyId, supabase, usingLocalData]
  );

  const createRecord = useCallback(
    async <TTable extends EditableTable>(table: TTable, values: Partial<TableRecord<TTable>>) => {
      if (supabase && !usingLocalData) assertCanSync(usingLocalData);

      const timestamp = nowIso();
      const previous = data;
      const record = {
        ...values,
        id: (values as { id?: string }).id ?? makeId(table),
        family_id: familyId,
        created_at: timestamp,
        updated_at: timestamp
      } as TableRecord<TTable>;

      setData((current) => ({
        ...current,
        [table]: [...current[table], record]
      }));

      if (supabase && !usingLocalData) {
        const { data: inserted, error } = await supabase.from(table).insert(record).select().single();
        if (error) {
          setData(previous);
          throw error;
        }
        const insertedRecord = inserted as TableRecord<TTable>;
        setData((current) => ({
          ...current,
          [table]: current[table].map((item) => (item.id === record.id ? insertedRecord : item))
        }));
        await appendActivity("created", table, insertedRecord);
        await appendNotification(notificationSeed(table, recordMap(insertedRecord)));
        return insertedRecord;
      }

      await appendActivity("created", table, record);
      await appendNotification(notificationSeed(table, recordMap(record)));
      return record;
    },
    [appendActivity, appendNotification, data, familyId, supabase, usingLocalData]
  );

  const updateRecord = useCallback(
    async <TTable extends EditableTable>(table: TTable, id: string, values: Partial<TableRecord<TTable>>) => {
      if (supabase && !usingLocalData) assertCanSync(usingLocalData);

      const timestamp = nowIso();
      const previous = data;
      const existingRecord = data[table].find((record) => record.id === id);

      if (!existingRecord) throw new Error("Record not found");

      const updatedRecord = { ...existingRecord, ...values, updated_at: timestamp } as TableRecord<TTable>;

      setData((current) => ({
        ...current,
        [table]: current[table].map((record) => (record.id === id ? ({ ...record, ...values, updated_at: timestamp } as TableRecord<TTable>) : record))
      }));

      if (supabase && !usingLocalData) {
        const { data: updated, error } = await supabase
          .from(table)
          .update({ ...values, updated_at: timestamp })
          .eq("id", id)
          .eq("family_id", familyId)
          .select()
          .single();
        if (error) {
          setData(previous);
          throw error;
        }
        const remoteUpdated = updated as TableRecord<TTable>;
        await appendActivity("updated", table, remoteUpdated);
        return remoteUpdated;
      }

      await appendActivity("updated", table, updatedRecord);
      return updatedRecord;
    },
    [appendActivity, data, familyId, supabase, usingLocalData]
  );

  const deleteRecord = useCallback(
    async <TTable extends EditableTable>(table: TTable, id: string) => {
      if (supabase && !usingLocalData) assertCanSync(usingLocalData);

      const previous = data;
      const deleted = data[table].find((record) => record.id === id);
      setData((current) => ({
        ...current,
        [table]: current[table].filter((record) => record.id !== id)
      }));

      if (supabase && !usingLocalData) {
        const { error } = await supabase.from(table).delete().eq("id", id).eq("family_id", familyId);
        if (error) {
          setData(previous);
          throw error;
        }
      }

      if (deleted) await appendActivity("deleted", table, deleted);
    },
    [appendActivity, data, familyId, supabase, usingLocalData]
  );

  const applyRealtimeChange = useCallback(
    <TTable extends EditableTable>(
      table: TTable,
      eventType: "INSERT" | "UPDATE" | "DELETE",
      newRecord?: Partial<TableRecord<TTable>> | null,
      oldRecord?: Partial<TableRecord<TTable>> | null
    ) => {
      if (usingLocalData) return;

      setData((current) => {
        if (eventType === "DELETE") {
          const id = oldRecord?.id;
          if (!id) return current;
          return {
            ...current,
            [table]: current[table].filter((record) => record.id !== id)
          };
        }

        if (!newRecord?.id || recordMap(newRecord).family_id !== familyId) return current;

        const exists = current[table].some((record) => record.id === newRecord.id);
        return {
          ...current,
          [table]: exists
            ? current[table].map((record) => (record.id === newRecord.id ? ({ ...record, ...newRecord } as TableRecord<TTable>) : record))
            : [...current[table], newRecord as TableRecord<TTable>]
        };
      });
    },
    [familyId, usingLocalData]
  );

  const clearCheckedGroceries = useCallback(async () => {
    if (supabase && !usingLocalData) assertCanSync(usingLocalData);

    const checkedIds = data.grocery_items.filter((item) => item.checked).map((item) => item.id);
    setData((current) => ({
      ...current,
      grocery_items: current.grocery_items.filter((item) => !item.checked)
    }));

    if (supabase && !usingLocalData && checkedIds.length > 0) {
      await supabase.from("grocery_items").delete().eq("family_id", familyId).in("id", checkedIds);
    }
    if (checkedIds.length > 0) await appendActivity("cleared", "grocery_items", { id: "checked_groceries" });
  }, [appendActivity, data.grocery_items, familyId, supabase, usingLocalData]);

  const addIngredientsToGrocery = useCallback(
    async (ingredients: string, store?: string | null) => {
      const items = ingredients
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      await Promise.all(
        items.map((name) =>
          createRecord("grocery_items", {
            name,
            category: "Other",
            quantity: "1",
            unit: null,
            store: store ?? null,
            needed_by: null,
            checked: false,
            added_by: currentMemberId
          })
        )
      );
    },
    [createRecord, currentMemberId]
  );

  const restoreStarterData = useCallback(() => {
    const seeded = createSeedData();
    setData(seeded);
    setCurrentUser(localUser);
    setUsingLocalData(true);
    localStorage.setItem(storageKey, JSON.stringify(seeded));
  }, []);

  const value = useMemo(
    () => ({
      data,
      currentUser,
      currentMember,
      currentMemberId,
      familyId,
      supabase,
      supabaseConfigured: Boolean(supabase),
      usingLocalData,
      loading,
      createWorkspace,
      updateFamilyName,
      signIn,
      signUp,
      signOut,
      createRecord,
      updateRecord,
      deleteRecord,
      applyRealtimeChange,
      clearCheckedGroceries,
      addIngredientsToGrocery,
      restoreStarterData
    }),
    [
      addIngredientsToGrocery,
      clearCheckedGroceries,
      createRecord,
      createWorkspace,
      currentUser,
      currentMember,
      currentMemberId,
      data,
      deleteRecord,
      familyId,
      loading,
      applyRealtimeChange,
      restoreStarterData,
      signIn,
      signOut,
      signUp,
      supabase,
      updateRecord,
      updateFamilyName,
      usingLocalData
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PrivacyProvider>
          <AppDataProvider>{children}</AppDataProvider>
        </PrivacyProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
