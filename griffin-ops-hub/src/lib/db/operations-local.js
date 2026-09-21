import templates from "../../data/operationsTemplates.json";
import { resolveWorkDepartment, workRuleFailures } from "../workRules.js";
import {
  allowedWorkStatuses,
  canEditWork,
  departmentRole,
  workManager,
  workNoteRequired,
  WORK_PRIORITIES,
} from "../operationsPolicy.js";

const copy = (value) => structuredClone(value);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const fields = (template) =>
  (template.sections || []).flatMap((section) => section.fields || []);
const visible = (field, data) =>
  !field.showWhen ||
  (field.showWhen.in
    ? field.showWhen.in.includes(data[field.showWhen.key])
    : data[field.showWhen.key] === field.showWhen.equals);
const filled = (f, data) =>
  f.type === "checkbox"
    ? data[f.key] === true
    : data[f.key] != null && String(data[f.key]).trim() !== "";
const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
function assertRequest(request, allowed) {
  if (!request || typeof request !== "object" || Array.isArray(request))
    throw new Error("Work request must be an object");
  for (const key of Object.keys(request))
    if (!allowed.includes(key))
      throw new Error(`Unsupported work request field: ${key}`);
}
function assertPayload(template, data, checks) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !checks ||
    typeof checks !== "object" ||
    Array.isArray(checks)
  )
    throw new Error("Work data and checks must be objects");
  if (JSON.stringify({ data, checks }).length > 200000)
    throw new Error("Work item exceeds the permitted size");
  const definitions = new Map(fields(template).map((f) => [f.key, f]));
  for (const [key, value] of Object.entries(data)) {
    const f = definitions.get(key);
    if (!f) throw new Error(`Unknown work item field: ${key}`);
    if (value == null || value === "") continue;
    if (f.type === "checkbox") {
      if (typeof value !== "boolean")
        throw new Error(`${f.label} must be a checkbox value`);
      continue;
    }
    if (!["string", "number"].includes(typeof value))
      throw new Error(`Invalid value for ${f.label}`);
    if (f.maxLength && String(value).length > f.maxLength)
      throw new Error(`${f.label} exceeds ${f.maxLength} characters`);
    if (f.type === "select" && !f.options?.includes(value))
      throw new Error(`Select a valid option for ${f.label}`);
    if (f.type === "date") {
      if (!validDate(value)) throw new Error(`${f.label} must be a valid date`);
      const year = Number(value.slice(0, 4));
      if ((f.minYear && year < f.minYear) || (f.maxYear && year > f.maxYear))
        throw new Error(`${f.label} is outside the permitted year range`);
    }
    if (f.type === "number") {
      if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(String(value)))
        throw new Error(`${f.label} must be a number`);
      const n = Number(value);
      if (
        !Number.isFinite(n) ||
        (f.min != null && n < f.min) ||
        (f.max != null && n > f.max) ||
        (f.exclusiveMin != null && n <= f.exclusiveMin)
      )
        throw new Error(`${f.label} is outside the permitted range`);
      if (
        f.precision != null &&
        (String(value).split(".")[1]?.length || 0) > f.precision
      )
        throw new Error(`${f.label} allows ${f.precision} decimal places`);
    }
  }
  const known = new Set((template.checklist || []).map((c) => c.id));
  for (const [key, value] of Object.entries(checks))
    if (!known.has(key) || typeof value !== "boolean")
      throw new Error(`Invalid checklist response: ${key}`);
}
function assertComplete(item) {
  const missing = fields(item.template_snapshot).filter(
    (f) => f.required && visible(f, item.data) && !filled(f, item.data),
  );
  const checks = (item.template_snapshot.checklist || []).filter(
    (c) => c.required && item.checks[c.id] !== true,
  );
  if (missing.length || checks.length)
    throw new Error(
      `${missing.length} required fields and ${checks.length} required checks remain`,
    );
  const ruleFailures = workRuleFailures(item.template_snapshot, item.data);
  if (ruleFailures.length)
    throw new Error(ruleFailures.map((failure) => failure.label).join(" "));
}
export function createOperationsLocal({
  getState,
  transact,
  actor,
  canSeeLoan,
  genId,
  now,
  notify,
  initializePortfolio,
}) {
  const canRead = (item, state) => {
    const me = actor();
    return (
      item &&
      (item.created_by === me.id ||
        item.owner_id === me.id ||
        workManager(item, me) ||
        (departmentRole(item.department, me.role) &&
          !!me.branch &&
          me.branch === item.branch) ||
        canSeeLoan(state.loans[item.loan_number]))
    );
  };
  const get = (state, id, expected) => {
    const item = state.workItems[id];
    if (!canRead(item, state))
      throw new Error("Work item not found or access denied");
    if (expected !== undefined && (!expected || expected !== item.updated_at))
      throw new Error(
        "This work item changed or its revision is missing. Reload before saving.",
      );
    return item;
  };
  const revision = (expected) => {
    if (!expected)
      throw new Error(
        "A work item revision is required. Reload before saving.",
      );
  };
  const audit = (state, item, action, extra = {}) =>
    state.workEvents.push({
      id: genId(),
      work_item_id: item.id,
      loan_number: item.loan_number,
      actor_id: actor().id,
      actor_role: actor().role,
      at: item.updated_at,
      action,
      ...extra,
    });
  const owner = (state, item, id) => {
    if (!id) return null;
    const p = state.profiles.find((p) => p.id === id && p.active !== false);
    if (
      !p ||
      !departmentRole(item.department, p.role) ||
      !p.branch ||
      p.branch !== item.branch
    )
      throw new Error(
        "Assign an active member of the work item department and branch",
      );
    return id;
  };
  const meta = (item) => {
    if (!WORK_PRIORITIES.includes(item.priority))
      throw new Error("Invalid work priority");
    if (
      typeof item.title !== "string" ||
      !item.title.trim() ||
      item.title.length > 200
    )
      throw new Error("Use a work title of 1–200 characters");
    if (item.due_date && !validDate(item.due_date))
      throw new Error("Use a valid due date");
  };
  const create = (state, request) => {
    assertRequest(request, [
      "loanNumber",
      "borrowerLast",
      "templateId",
      "department",
      "title",
      "priority",
      "dueDate",
      "ownerId",
      "data",
    ]);
    const me = actor();
    const template = templates.find((t) => t.id === request.templateId);
    if (!template) throw new Error("This work template is not published");
    const department = resolveWorkDepartment(template, request.department);
    if (
      ![
        "LO",
        "LOA",
        "MLP",
        "PROCESSOR",
        "CLOSING",
        "LOCK_DESK",
        "MANAGER",
        "ADMIN",
      ].includes(me.role)
    )
      throw new Error("Your role cannot create work items");
    if (!/^[A-Za-z0-9-]{1,40}$/.test(request.loanNumber || ""))
      throw new Error("Use a valid loan number");
    let loan = state.loans[request.loanNumber];
    if (loan && !canSeeLoan(loan))
      throw new Error("Loan unavailable or access denied");
    const at = now();
    if (!loan) {
      if (
        me.role === "LOCK_DESK" ||
        !me.branch ||
        (me.role === "LOA" && !me.assists_lo_id)
      )
        throw new Error(
          "A branch and an assigned loan owner are required to create this loan",
        );
      loan = {
        loan_number: request.loanNumber,
        borrower_last: request.borrowerLast || "",
        branch: me.branch,
        created_by: me.id,
        lo_id:
          me.role === "LO"
            ? me.id
            : me.role === "LOA"
              ? me.assists_lo_id
              : null,
        mlp_id: me.role === "MLP" ? me.id : null,
        processor_id: me.role === "PROCESSOR" ? me.id : null,
        current_stage: "DRAFT",
        created_at: at,
        updated_at: at,
      };
      state.loans[request.loanNumber] = loan;
    }
    if (!loan.branch)
      throw new Error(
        "Assign the loan branch before creating departmental work",
      );
    const item = {
      id: genId(),
      loan_number: request.loanNumber,
      borrower_last: loan.borrower_last || request.borrowerLast || "",
      branch: loan.branch,
      template_id: template.id,
      template_version: template.version,
      template_snapshot: copy(template),
      title: request.title || template.title,
      department,
      owner_id: null,
      status: "DRAFT",
      priority: request.priority || "NORMAL",
      due_date: request.dueDate || null,
      data: copy(request.data || {}),
      checks: {},
      created_by: me.id,
      created_at: at,
      updated_at: at,
      completed_at: null,
    };
    const keys = new Set(fields(template).map((f) => f.key));
    for (const key of ["loanNumber", "ln", "id_1"])
      if (keys.has(key)) {
        if (item.data[key] && item.data[key] !== item.loan_number)
          throw new Error("Loan number must match the linked loan");
        item.data[key] = item.loan_number;
      }
    if (keys.has("cln") && !item.data.cln) item.data.cln = item.borrower_last;
    item.owner_id = owner(state, item, request.ownerId);
    meta(item);
    assertPayload(template, item.data, item.checks);
    state.workItems[item.id] = item;
    audit(state, item, "CREATED", { to_status: "DRAFT" });
    return item;
  };
  return {
    async listWorkItems({ loanNumber } = {}) {
      const state = getState();
      return copy(
        Object.values(state.workItems)
          .filter(
            (i) =>
              (!loanNumber || i.loan_number === loanNumber) &&
              canRead(i, state),
          )
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      );
    },
    async getWorkItem(id) {
      const state = getState();
      return canRead(state.workItems[id], state)
        ? copy(state.workItems[id])
        : null;
    },
    async createWorkItem(request) {
      return transact((state) => create(state, request));
    },
    async saveWorkItem(id, request) {
      assertRequest(request, [
        "data",
        "checks",
        "ownerId",
        "dueDate",
        "priority",
        "title",
        "expectedUpdatedAt",
      ]);
      revision(request.expectedUpdatedAt);
      return transact((state) => {
        const item = get(state, id, request.expectedUpdatedAt);
        if (!canEditWork(item, actor()))
          throw new Error("You cannot edit this work item at this stage");
        const before = copy(item);
        if (request.data !== undefined) item.data = copy(request.data);
        if (request.checks !== undefined) item.checks = copy(request.checks);
        if (request.ownerId !== undefined)
          item.owner_id = owner(state, item, request.ownerId);
        if (request.dueDate !== undefined)
          item.due_date = request.dueDate || null;
        if (request.priority !== undefined) item.priority = request.priority;
        if (request.title !== undefined) item.title = request.title;
        for (const key of ["loanNumber", "ln", "id_1"])
          if (
            fields(item.template_snapshot).some((f) => f.key === key) &&
            item.data[key] !== item.loan_number
          )
            throw new Error("Loan number must match the linked loan");
        meta(item);
        assertPayload(item.template_snapshot, item.data, item.checks);
        const attestationKeys = new Set(
          fields(item.template_snapshot)
            .filter((f) => f.required && f.type === "checkbox")
            .map((f) => f.key),
        );
        const changedDataKeys = [
          ...new Set([...Object.keys(before.data), ...Object.keys(item.data)]),
        ].filter((key) => !same(before.data[key], item.data[key]));
        if (changedDataKeys.length) {
          for (const key of Object.keys(before.checks))
            if (before.checks[key] === true && item.checks[key] === true)
              item.checks[key] = false;
        }
        if (changedDataKeys.some((key) => !attestationKeys.has(key))) {
          for (const key of attestationKeys)
            if (before.data[key] === true && item.data[key] === true)
              item.data[key] = false;
        }
        const changes = {};
        for (const key of ["data", "checks"])
          for (const field of new Set([
            ...Object.keys(before[key]),
            ...Object.keys(item[key]),
          ]))
            if (!same(before[key][field], item[key][field]))
              changes[`${key}.${field}`] = {
                from: before[key][field] ?? null,
                to: item[key][field] ?? null,
              };
        for (const key of ["owner_id", "due_date", "priority", "title"])
          if (!same(before[key], item[key]))
            changes[key] = { from: before[key], to: item[key] };
        if (!Object.keys(changes).length) return item;
        item.updated_at = now(item.updated_at);
        audit(state, item, "UPDATED", { changes });
        return item;
      });
    },
    async transitionWorkItem(id, status, note, { expectedUpdatedAt } = {}) {
      revision(expectedUpdatedAt);
      return transact((state) => {
        const item = get(state, id, expectedUpdatedAt);
        if (!allowedWorkStatuses(item, actor()).includes(status))
          throw new Error("Your role cannot make this work transition");
        if (workNoteRequired(item, status) && !note?.trim())
          throw new Error("A note is required for this work transition");
        if (note?.length > 5000)
          throw new Error("Keep the transition note within 5,000 characters");
        if (["REVIEW", "COMPLETE"].includes(status)) assertComplete(item);
        const from = item.status;
        item.status = status;
        item.updated_at = now(item.updated_at);
        item.completed_at = status === "COMPLETE" ? item.updated_at : null;
        if (
          status === "IN_PROGRESS" &&
          !item.owner_id &&
          departmentRole(item.department, actor().role)
        )
          item.owner_id = actor().id;
        audit(state, item, "STATUS_CHANGED", {
          from_status: from,
          to_status: status,
          note: note?.trim() || null,
        });
        return item;
      });
    },
    async getWorkActivity(id) {
      const state = getState();
      get(state, id);
      return copy({
        events: state.workEvents
          .filter((e) => e.work_item_id === id)
          .sort((a, b) => b.at.localeCompare(a.at)),
        timeEntries: state.workTime
          .filter((e) => e.work_item_id === id)
          .sort((a, b) => b.at.localeCompare(a.at)),
      });
    },
    async logWorkTime(id, { minutes, note, expectedUpdatedAt }) {
      revision(expectedUpdatedAt);
      return transact((state) => {
        const item = get(state, id, expectedUpdatedAt);
        if (!canEditWork(item, actor()))
          throw new Error("You cannot log time on this work item");
        if (
          typeof minutes !== "number" ||
          !Number.isFinite(minutes) ||
          minutes <= 0 ||
          minutes > 1440
        )
          throw new Error("Log between 0 and 1,440 minutes, greater than zero");
        if (!note?.trim() || note.length > 5000)
          throw new Error("A work note of 1–5,000 characters is required");
        item.updated_at = now(item.updated_at);
        const entry = {
          id: genId(),
          work_item_id: id,
          actor_id: actor().id,
          actor_role: actor().role,
          minutes,
          note: note.trim(),
          at: item.updated_at,
        };
        state.workTime.push(entry);
        audit(state, item, "TIME_LOGGED", { minutes, note: note.trim() });
        return item;
      });
    },
    async loadDemoOperations() {
      if (Object.keys(getState().workItems).length)
        throw new Error("Reset the demo before loading sample operations");
      transact((state) => {
        if (!Object.keys(state.loans).length) initializePortfolio(state);
        const loans = Object.values(state.loans).filter(canSeeLoan);
        if (!loans.length)
          throw new Error(
            "Switch to a demo role with an accessible loan before loading sample operations",
          );
        const statuses = [
          "QUEUED",
          "IN_PROGRESS",
          "BLOCKED",
          "DRAFT",
          "REVIEW",
          "COMPLETE",
          "CANCELLED",
          "IN_PROGRESS",
          "QUEUED",
        ];
        templates.forEach((template, index) => {
          const loan = loans[index % loans.length];
          const assigned = state.profiles.find(
            (p) =>
              p.active !== false &&
              p.branch === loan.branch &&
              departmentRole(template.department, p.role),
          );
          const data = {};
          for (const f of fields(template))
            if (f.required) {
              data[f.key] =
                f.type === "checkbox"
                  ? true
                  : f.type === "select"
                    ? f.options[0]
                    : f.type === "number"
                      ? String(Math.max(f.min ?? 0, (f.exclusiveMin ?? -1) + 1))
                      : f.type === "date"
                        ? new Date().toISOString().slice(0, 10)
                        : "Fictional sample".slice(0, f.maxLength || 100);
            }
          // Synthetic examples use explicit permitted dispositions. The bounded
          // pass cannot turn invalid or contradictory published rules into a pass.
          for (
            let pass = 0;
            pass <= (template.completionRules?.length || 0);
            pass++
          ) {
            const failures = workRuleFailures(template, data);
            if (!failures.length) break;
            for (const failure of failures) {
              const rule = template.completionRules?.find(
                (rule) => rule.id === failure.id,
              );
              if (!rule) throw new Error(failure.label);
              data[rule.field] = rule.in[0];
            }
          }
          for (const key of ["loanNumber", "ln", "id_1"])
            if (fields(template).some((f) => f.key === key))
              data[key] = loan.loan_number;
          if (fields(template).some((f) => f.key === "cln"))
            data.cln = loan.borrower_last;
          for (const key of ["borrowerName", "id_2"])
            if (fields(template).some((f) => f.key === key))
              data[key] = `Fictional ${loan.borrower_last}`;
          const item = create(state, {
            loanNumber: loan.loan_number,
            templateId: template.id,
            priority: index % 3 === 0 ? "HIGH" : "NORMAL",
            dueDate: new Date(Date.now() + (index - 2) * 86400000)
              .toISOString()
              .slice(0, 10),
            ownerId: assigned?.id,
            data,
          });
          item.synthetic = true;
          item.sample_label =
            "Fictional demonstration. No actual human review or loan outcome.";
          for (const event of state.workEvents.filter(
            (event) => event.work_item_id === item.id,
          ))
            event.synthetic = true;
          item.checks = Object.fromEntries(
            (template.checklist || [])
              .filter((c) => c.required)
              .map((c) => [c.id, true]),
          );
          const from = item.status;
          item.status = statuses[index % statuses.length];
          item.updated_at = now(item.updated_at);
          item.completed_at =
            item.status === "COMPLETE" ? item.updated_at : null;
          if (["REVIEW", "COMPLETE"].includes(item.status))
            assertComplete(item);
          audit(state, item, "SAMPLE_STATUS", {
            from_status: from,
            to_status: item.status,
            synthetic: true,
            note: "Fictional seeded example; no actual human review performed.",
          });
        });
      });
      notify();
    },
  };
}
