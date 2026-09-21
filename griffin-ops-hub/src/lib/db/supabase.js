// Browser reads remain protected by RLS. All writes use atomic database functions
// that derive the actor from the session and enforce field/stage permissions.
import { createClient } from "@supabase/supabase-js";
import { mergeSchema } from "../schema.js";
import { computeReports } from "../reports.js";

const ALLOWED_DOMAIN =
  import.meta.env.VITE_ALLOWED_DOMAIN || "griffinfunding.com";
export function createSupabaseDb(url, publishableKey) {
  const sb = createClient(url, publishableKey);
  const must = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };
  const all = async (build) => {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const page = must(await build().range(from, from + 999));
      rows.push(...page);
      if (page.length < 1000) return rows;
      if (rows.length >= 50000)
        throw new Error(
          "This view exceeds 50,000 records. Use a narrower reporting scope.",
        );
    }
  };
  const profile = async () => {
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();
    if (error) throw error;
    return user
      ? must(
          await sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        )
      : null;
  };
  return {
    mode: "supabase",
    auth: {
      async getSession() {
        return must(await sb.auth.getSession()).session;
      },
      async signInWithGoogle() {
        return must(
          await sb.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: window.location.origin,
              queryParams: { hd: ALLOWED_DOMAIN, prompt: "select_account" },
            },
          }),
        );
      },
      async signOut() {
        return must(await sb.auth.signOut());
      },
      onChange(fn) {
        const { data: sub } = sb.auth.onAuthStateChange(() => fn());
        return () => sub.subscription.unsubscribe();
      },
    },
    getProfile: profile,
    async listProfiles() {
      return all(() => sb.from("profiles").select("*").order("id"));
    },
    async updateProfile(id, patch) {
      return must(await sb.rpc("update_profile", { p_id: id, p_patch: patch }));
    },
    async getInvestorData() {
      const rows = await all(() =>
        sb
          .from("investor_configs")
          .select("*")
          .is("effective_to", null)
          .order("id"),
      );
      const pr = {};
      const byId = {};
      for (const r of rows) {
        for (const type of r.product_types || []) {
          pr[type] ||= { A: [], B: [], C: [] };
          pr[type][r.class]?.push({ id: r.id, n: r.name });
        }
        byId[r.id] = {
          ...(r.config || {}),
          name: r.name,
          source_status: r.source_status || "UNVERIFIED_REFERENCE",
          source_document: r.source_document,
          source_reviewed_at: r.source_reviewed_at,
        };
      }
      return { PR: pr, CFG: byId, byId };
    },
    async getSchema(formType, version, baseVersion) {
      let query = sb.from("form_schemas").select("*").eq("form_type", formType);
      let baseQuery = sb
        .from("form_schemas")
        .select("*")
        .eq("form_type", "BASE");
      if (version) query = query.eq("version", version);
      if (baseVersion) baseQuery = baseQuery.eq("version", baseVersion);
      const [product, base] = await Promise.all([
        query.order("version", { ascending: false }).limit(1).maybeSingle(),
        baseQuery.order("version", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const p = must(product);
      const b = must(base);
      if (!p || !b)
        throw new Error(
          "The requested worksheet schema is not published. Provision the reference schemas first.",
        );
      return mergeSchema(b.schema, p.schema);
    },
    async findLoan(loanNumber) {
      return must(
        await sb
          .from("loans")
          .select("*")
          .eq("loan_number", loanNumber)
          .maybeSingle(),
      );
    },
    async listLoans() {
      return all(() => sb.from("loans").select("*").order("loan_number"));
    },
    async upsertLoan() {
      throw new Error("Loan records are maintained through worksheet actions");
    },
    // The connected schema has no loan coordination columns yet. The UI reads
    // this flag and shows the fields as read-only until a migration adds them.
    capabilities: { loanCoordination: false, loanEvents: true },
    async setLoanCoordination() {
      throw new Error(
        "Loan coordination fields are not available in this connected workspace yet",
      );
    },
    async listLoanEvents(loanNumber) {
      return all(() =>
        sb
          .from("operations_events")
          .select("*")
          .eq("loan_number", loanNumber)
          .order("at", { ascending: false })
          .order("id"),
      );
    },
    async listWorksheets({ stages, loanNumber } = {}) {
      return all(() => {
        let query = sb.from("worksheets").select("*").order("id");
        if (stages) query = query.in("stage", stages);
        if (loanNumber) query = query.eq("loan_number", loanNumber);
        return query;
      });
    },
    async getWorksheet(id) {
      return must(
        await sb.from("worksheets").select("*").eq("id", id).maybeSingle(),
      );
    },
    async createWorksheet({ loanNumber, formType, borrowerLast, data = {} }) {
      return must(
        await sb.rpc("create_worksheet", {
          p_loan_number: loanNumber,
          p_form_type: formType,
          p_borrower_last: borrowerLast || data.cln || "",
          p_data: data,
        }),
      );
    },
    async saveWorksheet(id, { data, expectedUpdatedAt } = {}) {
      return must(
        await sb.rpc("save_worksheet", {
          p_worksheet: id,
          p_data: data,
          p_expected_updated_at: expectedUpdatedAt || null,
        }),
      );
    },
    async setVerified(id, key, verified, { expectedUpdatedAt } = {}) {
      return must(
        await sb.rpc("set_worksheet_verified", {
          p_worksheet: id,
          p_key: key,
          p_verified: verified,
          p_expected_updated_at: expectedUpdatedAt || null,
        }),
      );
    },
    async transition(id, toStage, note, { expectedUpdatedAt } = {}) {
      return must(
        await sb.rpc("transition_worksheet", {
          p_worksheet: id,
          p_to: toStage,
          p_note: note?.trim() || null,
          p_expected_updated_at: expectedUpdatedAt || null,
        }),
      );
    },
    async getActivity(id) {
      const [events, transitions] = await Promise.all([
        all(() =>
          sb
            .from("field_events")
            .select("*")
            .eq("worksheet_id", id)
            .order("at", { ascending: false })
            .order("id"),
        ),
        all(() =>
          sb
            .from("stage_transitions")
            .select("*")
            .eq("worksheet_id", id)
            .order("at", { ascending: false })
            .order("id"),
        ),
      ]);
      return { events, transitions };
    },
    async listWorkItems({ loanNumber } = {}) {
      return all(() => {
        let query = sb.from("operations_work_items").select("*").order("id");
        if (loanNumber) query = query.eq("loan_number", loanNumber);
        return query;
      });
    },
    async getWorkItem(id) {
      return must(
        await sb
          .from("operations_work_items")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
      );
    },
    async createWorkItem(request) {
      return must(await sb.rpc("create_work_item", { p_request: request }));
    },
    async saveWorkItem(id, { expectedUpdatedAt, ...patch }) {
      return must(
        await sb.rpc("save_work_item", {
          p_id: id,
          p_patch: patch,
          p_expected: expectedUpdatedAt || null,
        }),
      );
    },
    async transitionWorkItem(id, status, note, { expectedUpdatedAt } = {}) {
      return must(
        await sb.rpc("transition_work_item", {
          p_id: id,
          p_status: status,
          p_note: note?.trim() || null,
          p_expected: expectedUpdatedAt || null,
        }),
      );
    },
    async logWorkTime(id, { minutes, note, expectedUpdatedAt }) {
      return must(
        await sb.rpc("log_work_time", {
          p_id: id,
          p_minutes: minutes,
          p_note: note,
          p_expected: expectedUpdatedAt || null,
        }),
      );
    },
    async getWorkActivity(id) {
      const [events, timeEntries] = await Promise.all([
        all(() =>
          sb
            .from("operations_events")
            .select("*")
            .eq("work_item_id", id)
            .order("at", { ascending: false })
            .order("id"),
        ),
        all(() =>
          sb
            .from("operations_time_entries")
            .select("*")
            .eq("work_item_id", id)
            .order("at", { ascending: false })
            .order("id"),
        ),
      ]);
      return { events, timeEntries };
    },
    async reports() {
      const [loans, worksheets, transitions, events, profiles] =
        await Promise.all([
          this.listLoans(),
          this.listWorksheets(),
          all(() => sb.from("stage_transitions").select("*").order("id")),
          all(() => sb.from("field_events").select("*").order("id")),
          this.listProfiles(),
        ]);
      return computeReports({
        loans,
        worksheets,
        transitions,
        events,
        profiles,
      });
    },
  };
}
