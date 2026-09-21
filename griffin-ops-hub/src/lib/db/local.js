// Isolated browser demonstration. This adapter is not an authentication boundary.
// Real borrower data belongs in the authenticated server adapter.
import base from "../../data/schemas/base.json";
import dscr from "../../data/schemas/dscr.json";
import {
  PR,
  CFG,
  BUTTON_PLACEHOLDER,
  ST,
  PT,
  CZ,
  CE,
} from "../../data/investors.js";
import { createDemoPortfolio } from "../../data/demoPortfolio.js";
import { createOperationsLocal } from "./operations-local.js";
import {
  mergeSchema,
  expandField,
  verification,
  isFilled,
  resolveOptions,
} from "../schema.js";
import {
  ROLES,
  canEditField,
  canVerifyField,
  assertTransition,
} from "../stages.js";
import { computeReports } from "../reports.js";

const KEY = "gfhub.demo.v1";
const copy = (value) => structuredClone(value);
const DEMO_USERS = [
  {
    id: "u-lo",
    email: "demo.lo@griffinfunding.com",
    full_name: "Demo Loan Officer",
    role: "LO",
    branch: "San Diego",
    active: true,
  },
  {
    id: "u-loa",
    email: "demo.loa@griffinfunding.com",
    full_name: "Demo LOA",
    role: "LOA",
    branch: "San Diego",
    assists_lo_id: "u-lo",
    active: true,
  },
  {
    id: "u-mlp",
    email: "demo.mlp@griffinfunding.com",
    full_name: "Demo MLP",
    role: "MLP",
    branch: "San Diego",
    active: true,
  },
  {
    id: "u-proc",
    email: "demo.processor@griffinfunding.com",
    full_name: "Demo Processor",
    role: "PROCESSOR",
    branch: "San Diego",
    active: true,
  },
  {
    id: "u-close",
    email: "demo.closing@griffinfunding.com",
    full_name: "Demo Closing",
    role: "CLOSING",
    branch: "San Diego",
    active: true,
  },
  {
    id: "u-lock",
    email: "demo.lockdesk@griffinfunding.com",
    full_name: "Demo Lock Desk",
    role: "LOCK_DESK",
    branch: "San Diego",
    active: true,
  },
  {
    id: "u-mgr",
    email: "demo.manager@griffinfunding.com",
    full_name: "Demo Branch Manager",
    role: "MANAGER",
    branch: "San Diego",
    active: true,
  },
  {
    id: "u-admin",
    email: "demo.admin@griffinfunding.com",
    full_name: "Demo Admin",
    role: "ADMIN",
    branch: "HQ",
    active: true,
  },
];
const blank = () => ({
  currentUserId: "u-lo",
  profiles: copy(DEMO_USERS),
  loans: {},
  worksheets: {},
  events: [],
  transitions: [],
  workItems: {},
  workEvents: [],
  workTime: [],
});
function load() {
  if (typeof localStorage === "undefined") return blank();
  const raw = localStorage.getItem(KEY);
  if (!raw) return blank();
  try {
    const state = JSON.parse(raw);
    if (
      !Array.isArray(state.profiles) ||
      !state.loans ||
      !state.worksheets ||
      !Array.isArray(state.events) ||
      !Array.isArray(state.transitions)
    )
      throw new Error("invalid");
    state.workItems ||= {};
    state.workEvents ||= [];
    state.workTime ||= [];
    for (const profile of DEMO_USERS) {
      if (!state.profiles.some((existing) => existing.id === profile.id)) {
        state.profiles.push(copy(profile));
      }
    }
    return state;
  } catch {
    throw new Error(
      "Saved demo data cannot be read. Export or clear this browser storage before continuing.",
    );
  }
}
const genId = () => crypto.randomUUID();
const now = (previous) =>
  new Date(
    Math.max(Date.now(), new Date(previous || 0).getTime() + 1),
  ).toISOString();
const equal = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const dataObject = (data) => {
  if (!data || Array.isArray(data) || typeof data !== "object")
    throw new Error("Worksheet data must be an object");
  if (Object.keys(data).length > 500 || JSON.stringify(data).length > 200000)
    throw new Error("Worksheet data exceeds the allowed size");
};
function fieldMap(schema) {
  const out = {};
  for (const section of schema.sections)
    for (const field of section.fields) {
      if (["callout", "note", "scoreSummary"].includes(field.type)) continue;
      for (const leaf of expandField(field)) {
        const type =
          field.type === "address"
            ? "text"
            : field.type === "bucket"
              ? leaf.key === field.valueKey
                ? "number"
                : "yn"
              : field.type;
        out[leaf.key] = {
          ...field,
          ...leaf,
          type,
          ...(field.type === "address" && leaf.key === field.keys.state
            ? { optionsRef: "ST" }
            : {}),
        };
      }
      if (field.type === "checkgroup")
        for (const item of field.items || [])
          out[item.key] = { ...field, key: item.key, type: "checkbox" };
    }
  return out;
}

export function createLocalDb() {
  let state = load();
  const listeners = new Set();
  const current = () =>
    state.profiles.find(
      (p) => p.id === state.currentUserId && p.active !== false,
    ) || null;
  const notify = () => listeners.forEach((fn) => fn(copy(current())));
  const actor = () => {
    const me = current();
    if (!me || me.role === "PENDING")
      throw new Error("An active assigned role is required");
    return me;
  };
  // Commit durable storage first. A quota/storage failure leaves the in-memory state unchanged.
  const commit = (next) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    state = next;
  };
  const transact = (fn) => {
    state = load();
    const next = copy(state);
    const result = fn(next);
    commit(next);
    return copy(result);
  };
  const investorData = () => {
    const byId = copy(CFG);
    const pr = copy(PR);
    if (!pr.DSCR.C.some((p) => p.id === BUTTON_PLACEHOLDER.id))
      pr.DSCR.C.push({ id: BUTTON_PLACEHOLDER.id, n: BUTTON_PLACEHOLDER.n });
    byId[BUTTON_PLACEHOLDER.id] = copy(BUTTON_PLACEHOLDER.cfg);
    const names = {};
    Object.values(pr).forEach((cls) =>
      Object.values(cls).forEach((list) =>
        list.forEach((p) => {
          names[p.id] = p.n;
        }),
      ),
    );
    Object.keys(byId).forEach((id) => {
      byId[id] = {
        ...byId[id],
        name: names[id] || id,
        source_status: "UNVERIFIED_REFERENCE",
      };
    });
    return { PR: pr, CFG: byId, byId };
  };
  const schemas = {
    DSCR: { ...mergeSchema(base, dscr), option_refs: { ST, PT, CZ, CE } },
  };
  const canSee = (loan) => {
    const me = current();
    if (!loan || !me || me.active === false) return false;
    if (me.role === "ADMIN") return true;
    if (me.role === "LO") return loan.lo_id === me.id;
    if (me.role === "LOA")
      return !!me.assists_lo_id && loan.lo_id === me.assists_lo_id;
    const sameBranch = !!me.branch && loan.branch === me.branch;
    if (me.role === "CLOSING" && sameBranch && loan.created_by === me.id)
      return true;
    if (me.role === "MANAGER")
      return (
        sameBranch ||
        state.profiles.some(
          (p) => p.id === loan.lo_id && p.manager_id === me.id,
        )
      );
    if (me.role === "MLP")
      return (
        loan.mlp_id === me.id ||
        (sameBranch &&
          !loan.mlp_id &&
          [
            "LO_SUBMITTED",
            "MLP_REVIEW",
            "MLP_VERIFIED",
            "RETURNED_TO_MLP",
            "SUBMITTED_TO_PROCESSING",
            "PROCESSING_ACCEPTED",
            "COMPLETE",
          ].includes(loan.current_stage))
      );
    if (me.role === "PROCESSOR")
      return (
        loan.processor_id === me.id ||
        (sameBranch &&
          !loan.processor_id &&
          [
            "SUBMITTED_TO_PROCESSING",
            "PROCESSING_ACCEPTED",
            "RETURNED_TO_MLP",
            "COMPLETE",
          ].includes(loan.current_stage))
      );
    return (
      sameBranch &&
      (me.role === "LOCK_DESK" ||
        (me.role === "CLOSING" &&
          ["PROCESSING_ACCEPTED", "COMPLETE"].includes(loan.current_stage)))
    );
  };
  const accessible = (next, id, expectedUpdatedAt) => {
    actor();
    const ws = next.worksheets[id];
    if (!ws || !canSee(next.loans[ws.loan_number]))
      throw new Error("Worksheet not found or access denied");
    if (expectedUpdatedAt && ws.updated_at !== expectedUpdatedAt)
      throw new Error(
        "This worksheet changed in another session. Reload before saving.",
      );
    return ws;
  };
  const schemaFor = (ws) => {
    if (ws.schema_snapshot) return ws.schema_snapshot;
    if (schemas[ws.form_type]?.version !== ws.schema_version)
      throw new Error(
        "The original worksheet schema is unavailable. Export this record before resetting the demo.",
      );
    return schemas[ws.form_type];
  };
  const context = (ws) => ({
    data: ws.data,
    investor: ws.investor_snapshot || investorData().byId[ws.data.pr],
    product: ws.form_type,
  });
  const event = (next, ws, key, action, value) => {
    const me = actor();
    next.events.push({
      id: genId(),
      worksheet_id: ws.id,
      field_key: key,
      action,
      actor_id: me.id,
      actor_role: me.role,
      value_snapshot: value || null,
      at: ws.updated_at,
    });
  };
  const validateChanges = (ws, data, initial = false) => {
    dataObject(data);
    const me = actor();
    const fields = fieldMap(schemaFor(ws));
    const changed = [];
    for (const key of new Set([
      ...Object.keys(ws.data || {}),
      ...Object.keys(data),
    ])) {
      if (equal(ws.data?.[key], data[key])) continue;
      const field = fields[key];
      if (!field) throw new Error(`Unknown worksheet field: ${key}`);
      if (field.lockedAfterCreate && !initial)
        throw new Error(`${field.label} cannot change after creation`);
      if (!canEditField(field, me.role, ws.stage))
        throw new Error(
          `Your role cannot edit ${field.label || key} at this stage`,
        );
      const value = data[key];
      if (
        value != null &&
        !["string", "number", "boolean"].includes(typeof value)
      )
        throw new Error(`Invalid value for ${field.label || key}`);
      if (
        field.type === "checkbox" &&
        value != null &&
        typeof value !== "boolean"
      )
        throw new Error(`${field.label || key} must be a checkbox value`);
      if (
        value !== "" &&
        value != null &&
        field.type === "investor" &&
        !investorData().byId[value]
      )
        throw new Error("Selected investor reference is unavailable");
      const investor =
        data.pr === ws.data.pr
          ? ws.investor_snapshot
          : investorData().byId[data.pr];
      const options =
        field.type === "yn"
          ? ["Yes", "No"]
          : field.optionsRef
            ? schemaFor(ws).option_refs?.[field.optionsRef]
            : resolveOptions(field, { data, investor });
      if (
        value !== "" &&
        value != null &&
        options?.length &&
        !options.includes(value)
      )
        throw new Error(`Select a valid option for ${field.label || key}`);
      if (
        field.type === "number" &&
        value !== "" &&
        value != null &&
        (typeof value === "boolean" || !Number.isFinite(Number(value)))
      )
        throw new Error(`${field.label} must be a number`);
      if (
        field.type === "date" &&
        value &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      )
        throw new Error(`${field.label} must be a valid date`);
      changed.push({ key, field });
    }
    return changed;
  };
  return {
    mode: "local",
    ...createOperationsLocal({
      getState: () => state,
      transact,
      actor,
      canSeeLoan: canSee,
      genId,
      now,
      notify,
      initializePortfolio: (next) => {
        Object.assign(next, copy(createDemoPortfolio(next.profiles)));
        for (const worksheet of Object.values(next.worksheets)) {
          worksheet.schema_snapshot = copy(schemas[worksheet.form_type]);
          worksheet.base_schema_version =
            worksheet.schema_snapshot.base_version;
          worksheet.investor_snapshot = copy(
            investorData().byId[worksheet.data.pr] || null,
          );
        }
      },
    }),
    auth: {
      async getSession() {
        return current() ? { user: copy(current()) } : null;
      },
      async signInWithGoogle() {
        transact((next) => {
          next.currentUserId = "u-lo";
        });
        notify();
      },
      async signOut() {
        transact((next) => {
          next.currentUserId = null;
        });
        notify();
      },
      onChange(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      listDemoUsers() {
        return copy(state.profiles);
      },
      switchDemoUser(id) {
        if (!state.profiles.some((p) => p.id === id && p.active !== false))
          throw new Error("Demo user unavailable");
        transact((next) => {
          next.currentUserId = id;
        });
        notify();
      },
    },
    async getProfile() {
      return copy(current());
    },
    async listProfiles() {
      actor();
      return copy(state.profiles);
    },
    async updateProfile(id, patch) {
      if (actor().role !== "ADMIN")
        throw new Error("Only an administrator can change access");
      if (
        Object.keys(patch).some(
          (k) =>
            ![
              "full_name",
              "role",
              "branch",
              "manager_id",
              "assists_lo_id",
              "active",
            ].includes(k),
        )
      )
        throw new Error("Unsupported profile change");
      if (patch.role && !ROLES.includes(patch.role))
        throw new Error("Invalid role");
      return transact((next) => {
        const p = next.profiles.find((x) => x.id === id);
        if (!p) throw new Error("Profile not found");
        Object.assign(p, patch);
        return p;
      });
    },
    async getInvestorData() {
      return investorData();
    },
    async getSchema(formType, version, baseVersion) {
      const s = schemas[formType];
      if (
        s &&
        ((version && version !== s.version) ||
          (baseVersion && baseVersion !== s.base_version))
      )
        throw new Error("The requested schema version is unavailable");
      return copy(s || null);
    },
    async findLoan(loanNumber) {
      return canSee(state.loans[loanNumber])
        ? copy(state.loans[loanNumber])
        : null;
    },
    async listLoans() {
      actor();
      return copy(
        Object.values(state.loans)
          .filter(canSee)
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      );
    },
    async upsertLoan() {
      throw new Error("Loan records are maintained through worksheet actions");
    },
    // Human-set coordination context on a loan. Neither value is a LendingPad
    // milestone; the observed LOS status is a manual, unverified note.
    capabilities: { loanCoordination: true, loanEvents: true },
    async setLoanCoordination(loanNumber, patch = {}) {
      const me = actor();
      const allowed = ["hubPhase", "observedLosStatus", "note"];
      for (const key of Object.keys(patch))
        if (!allowed.includes(key))
          throw new Error(`Unsupported loan coordination field: ${key}`);
      const phases = [
        "",
        "application",
        "preparation",
        "processing",
        "submission",
        "closing",
        "funded",
      ];
      if (patch.hubPhase !== undefined && !phases.includes(patch.hubPhase))
        throw new Error("Choose a published Hub coordination phase");
      for (const key of ["observedLosStatus", "note"])
        if (
          patch[key] !== undefined &&
          (typeof patch[key] !== "string" || patch[key].length > 200)
        )
          throw new Error("Keep loan coordination notes within 200 characters");
      const result = transact((next) => {
        const loan = next.loans[loanNumber];
        if (!loan || !canSee(loan))
          throw new Error("Loan unavailable or access denied");
        if (
          !["MLP", "PROCESSOR", "CLOSING", "LOCK_DESK", "MANAGER", "ADMIN", "LO", "LOA"].includes(
            me.role,
          )
        )
          throw new Error("Your role cannot record loan coordination");
        const before = {
          hub_phase: loan.hub_phase || "",
          observed_los_status: loan.observed_los_status || "",
          coordination_note: loan.coordination_note || "",
        };
        if (patch.hubPhase !== undefined) loan.hub_phase = patch.hubPhase || "";
        if (patch.observedLosStatus !== undefined)
          loan.observed_los_status = patch.observedLosStatus.trim();
        if (patch.note !== undefined) loan.coordination_note = patch.note.trim();
        const after = {
          hub_phase: loan.hub_phase || "",
          observed_los_status: loan.observed_los_status || "",
          coordination_note: loan.coordination_note || "",
        };
        if (equal(before, after)) return loan;
        loan.updated_at = now(loan.updated_at);
        loan.coordination_recorded_at = loan.updated_at;
        loan.coordination_recorded_by = me.id;
        next.workEvents.push({
          id: genId(),
          work_item_id: null,
          loan_number: loanNumber,
          actor_id: me.id,
          actor_role: me.role,
          at: loan.updated_at,
          action: "LOAN_COORDINATION",
          changes: Object.fromEntries(
            Object.keys(after)
              .filter((key) => before[key] !== after[key])
              .map((key) => [key, { from: before[key], to: after[key] }]),
          ),
        });
        return loan;
      });
      notify();
      return result;
    },
    // Every recorded operations event on a loan: work created, status changes,
    // saves, time entries, and coordination notes. Read scope follows the loan.
    async listLoanEvents(loanNumber) {
      actor();
      const loan = state.loans[loanNumber];
      if (!loan || !canSee(loan)) return [];
      return copy(
        state.workEvents
          .filter((event) => event.loan_number === loanNumber)
          .sort((a, b) => String(b.at).localeCompare(String(a.at))),
      );
    },
    async listWorksheets({ stages, loanNumber } = {}) {
      actor();
      return copy(
        Object.values(state.worksheets)
          .filter(
            (w) =>
              canSee(state.loans[w.loan_number]) &&
              (!stages || stages.includes(w.stage)) &&
              (!loanNumber || w.loan_number === loanNumber),
          )
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      );
    },
    async getWorksheet(id) {
      return state.worksheets[id] &&
        canSee(state.loans[state.worksheets[id].loan_number])
        ? copy(state.worksheets[id])
        : null;
    },
    async createWorksheet({ loanNumber, formType, borrowerLast, data = {} }) {
      const me = actor();
      const schema = schemas[formType];
      if (!["LO", "LOA", "MANAGER", "ADMIN"].includes(me.role))
        throw new Error("Your role cannot create worksheets");
      if (!schema) throw new Error("This worksheet type is not published");
      if (!/^[A-Za-z0-9-]{1,40}$/.test(loanNumber || ""))
        throw new Error(
          "Use a valid loan number with letters, numbers, or hyphens",
        );
      if (me.role === "LOA" && !me.assists_lo_id)
        throw new Error("An LO assignment is required");
      if (
        Object.values(state.worksheets).some(
          (w) => w.loan_number === loanNumber && w.stage !== "COMPLETE",
        )
      )
        throw new Error("This loan already has an active worksheet");
      return transact((next) => {
        const existing = next.loans[loanNumber];
        if (existing && !canSee(existing))
          throw new Error("Loan unavailable or access denied");
        const at = now();
        const ws = {
          id: genId(),
          loan_number: loanNumber,
          form_type: formType,
          schema_version: schema.version,
          base_schema_version: schema.base_version,
          schema_snapshot: copy(schema),
          investor_snapshot: null,
          data: {},
          verified: {},
          stage: "DRAFT",
          created_by: me.id,
          created_at: at,
          updated_at: at,
        };
        const initial = {
          ...data,
          ln: loanNumber,
          cln: borrowerLast || data.cln || "",
          dt: data.dt || at.slice(0, 10),
        };
        validateChanges(ws, initial, true);
        ws.data = initial;
        ws.investor_snapshot = copy(investorData().byId[initial.pr] || null);
        next.worksheets[ws.id] = ws;
        next.loans[loanNumber] = {
          ...existing,
          loan_number: loanNumber,
          created_at: existing?.created_at || at,
          borrower_last: initial.cln,
          product_type: formType,
          lo_id:
            existing?.lo_id ||
            (me.role === "LO" ? me.id : me.assists_lo_id || null),
          branch: existing?.branch || me.branch,
          current_stage: "DRAFT",
          updated_at: at,
        };
        for (const key of Object.keys(initial))
          event(next, ws, key, "COMPLETED", { from: null, to: initial[key] });
        next.transitions.push({
          id: genId(),
          worksheet_id: ws.id,
          loan_number: loanNumber,
          from_stage: null,
          to_stage: "DRAFT",
          actor_id: me.id,
          actor_role: me.role,
          note: "Created",
          at,
        });
        return ws;
      });
    },
    async saveWorksheet(id, { data, expectedUpdatedAt } = {}) {
      return transact((next) => {
        const ws = accessible(next, id, expectedUpdatedAt);
        const changes = validateChanges(ws, data);
        if (!changes.length) return ws;
        ws.updated_at = now(ws.updated_at);
        for (const { key } of changes)
          event(
            next,
            ws,
            key,
            isFilled({ key }, ws.data) ? "EDITED" : "COMPLETED",
            { from: ws.data[key] ?? null, to: data[key] ?? null },
          );
        if (changes.some(({ field }) => (field.owner || "LO") === "LO")) {
          for (const key of Object.keys(ws.verified))
            event(next, ws, key, "UNVERIFIED", {
              reason: "Loan officer data changed; review must be repeated",
            });
          ws.verified = {};
        }
        if (data.pr !== ws.data.pr)
          ws.investor_snapshot = copy(investorData().byId[data.pr] || null);
        ws.schema_snapshot ||= copy(schemaFor(ws));
        ws.base_schema_version ||= ws.schema_snapshot.base_version;
        ws.data = copy(data);
        const loan = next.loans[ws.loan_number];
        Object.assign(loan, {
          borrower_last: data.cln || "",
          investor_id: data.pr || null,
          lock_date: data.lockDate || null,
          disclosure_sent_at: data.discDate || null,
          updated_at: ws.updated_at,
        });
        return ws;
      });
    },
    async setVerified(id, key, verified, { expectedUpdatedAt } = {}) {
      return transact((next) => {
        const ws = accessible(next, id, expectedUpdatedAt);
        const field = fieldMap(schemaFor(ws))[key];
        if (!field || !canVerifyField(field, actor().role, ws.stage))
          throw new Error("You cannot verify this field at this stage");
        if (
          verified &&
          (!verification(schemaFor(ws), context(ws), ws.verified).items.some(
            (f) => f.key === key,
          ) ||
            !isFilled(field, ws.data))
        )
          throw new Error("Only a completed applicable field can be verified");
        if (!!ws.verified[key] === !!verified) return ws;
        ws.updated_at = now(ws.updated_at);
        if (verified) ws.verified[key] = { by: actor().id, at: ws.updated_at };
        else delete ws.verified[key];
        event(next, ws, key, verified ? "VERIFIED" : "UNVERIFIED");
        return ws;
      });
    },
    async transition(id, toStage, note, { expectedUpdatedAt } = {}) {
      return transact((next) => {
        const me = actor();
        const ws = accessible(next, id, expectedUpdatedAt);
        assertTransition({
          worksheet: ws,
          toStage,
          note,
          role: me.role,
          schema: schemaFor(ws),
          ctx: context(ws),
        });
        const from = ws.stage;
        ws.stage = toStage;
        ws.updated_at = now(ws.updated_at);
        const loan = next.loans[ws.loan_number];
        loan.current_stage = toStage;
        loan.updated_at = ws.updated_at;
        if (me.role === "MLP" && !loan.mlp_id) loan.mlp_id = me.id;
        if (me.role === "PROCESSOR" && !loan.processor_id)
          loan.processor_id = me.id;
        next.transitions.push({
          id: genId(),
          worksheet_id: id,
          loan_number: ws.loan_number,
          from_stage: from,
          to_stage: toStage,
          actor_id: me.id,
          actor_role: me.role,
          note: note?.trim() || null,
          at: ws.updated_at,
        });
        return ws;
      });
    },
    async getActivity(id) {
      accessible(state, id);
      return copy({
        events: state.events
          .filter((e) => e.worksheet_id === id)
          .sort((a, b) => b.at.localeCompare(a.at)),
        transitions: state.transitions
          .filter((t) => t.worksheet_id === id)
          .sort((a, b) => b.at.localeCompare(a.at)),
      });
    },
    async reports() {
      actor();
      const loans = Object.values(state.loans).filter(canSee);
      const keys = new Set(loans.map((l) => l.loan_number));
      const worksheets = Object.values(state.worksheets).filter((w) =>
        keys.has(w.loan_number),
      );
      const ids = new Set(worksheets.map((w) => w.id));
      return computeReports({
        loans: copy(loans),
        worksheets: copy(worksheets),
        transitions: copy(
          state.transitions.filter((t) => ids.has(t.worksheet_id)),
        ),
        events: copy(state.events.filter((e) => ids.has(e.worksheet_id))),
        profiles: copy(state.profiles),
      });
    },
    async loadDemoPortfolio() {
      if (
        Object.keys(state.loans).length ||
        Object.keys(state.worksheets).length
      )
        throw new Error("Reset the demo before loading the sample portfolio");
      transact((next) => {
        Object.assign(next, copy(createDemoPortfolio(next.profiles)));
        for (const ws of Object.values(next.worksheets)) {
          ws.schema_snapshot = copy(schemas[ws.form_type]);
          ws.base_schema_version = ws.schema_snapshot.base_version;
          ws.investor_snapshot = copy(investorData().byId[ws.data.pr] || null);
        }
      });
      notify();
    },
    async resetDemo() {
      commit(blank());
      notify();
    },
  };
}
