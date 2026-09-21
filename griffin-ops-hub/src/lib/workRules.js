// Only published template rules are evaluated. Item data never supplies rules.
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const scalar = (value) =>
  typeof value === "boolean" ||
  text(value) ||
  (typeof value === "number" && Number.isFinite(value));
const values = (value) =>
  Array.isArray(value) && value.length > 0 && value.every(scalar);
const own = (object, key) => Object.hasOwn(object, key);
const configFailure = (index = 0, field = "completionRules") => ({
  key: field,
  label:
    "The pinned completion rules are invalid. Ask the template owner to publish a corrected version.",
  kind: "rule",
  id: `invalid-completion-rule-${index}`,
});

export function workRuleFailures(template, data = {}) {
  if (!record(template)) return [configFailure()];
  if (!own(template, "completionRules")) return [];
  const rules = template.completionRules;
  if (!Array.isArray(rules) || !record(data)) return [configFailure()];
  if (!rules.length) return [];
  if (
    !Array.isArray(template.sections) ||
    template.sections.some(
      (section) =>
        !record(section) ||
        !Array.isArray(section.fields) ||
        section.fields.some((field) => !record(field) || !text(field.key)),
    )
  )
    return [configFailure()];
  const fields = new Set(
    (template.sections || [])
      .flatMap((section) => section.fields || [])
      .map((field) => field.key),
  );
  const ids = new Set();
  const failures = [];
  for (const [index, rule] of rules.entries()) {
    const valid =
      record(rule) &&
      text(rule.id) &&
      !ids.has(rule.id) &&
      text(rule.field) &&
      fields.has(rule.field) &&
      values(rule.in) &&
      text(rule.message) &&
      Object.keys(rule).every((key) =>
        ["id", "when", "field", "in", "message"].includes(key),
      );
    if (!valid) {
      failures.push(configFailure(index));
      continue;
    }
    ids.add(rule.id);
    let matches = true;
    if (own(rule, "when")) {
      const condition = rule.when;
      if (
        !record(condition) ||
        !text(condition.key) ||
        !fields.has(condition.key) ||
        own(condition, "equals") === own(condition, "in") ||
        !Object.keys(condition).every((key) =>
          ["key", "equals", "in"].includes(key),
        ) ||
        (own(condition, "equals")
          ? !scalar(condition.equals)
          : !values(condition.in))
      ) {
        failures.push(configFailure(index, rule.field));
        continue;
      }
      matches = own(condition, "equals")
        ? data[condition.key] === condition.equals
        : condition.in.includes(data[condition.key]);
    }
    if (matches && !rule.in.includes(data[rule.field]))
      failures.push({
        key: rule.field,
        label: rule.message,
        kind: "rule",
        id: rule.id,
      });
  }
  return failures;
}

export const WORK_DEPARTMENTS = Object.freeze([
  "LO",
  "MLP",
  "PROCESSOR",
  "CLOSING",
  "LOCK_DESK",
]);
export function resolveWorkDepartment(template, requested) {
  if (!record(template))
    throw new Error(
      "The published work template has invalid department routing",
    );
  const allowed = own(template, "allowedDepartments")
    ? template.allowedDepartments
    : [template.department];
  if (
    !Array.isArray(allowed) ||
    !allowed.length ||
    allowed.some((department) => !WORK_DEPARTMENTS.includes(department)) ||
    new Set(allowed).size !== allowed.length ||
    !allowed.includes(template.department)
  )
    throw new Error(
      "The published work template has invalid department routing",
    );
  const department = requested === undefined ? template.department : requested;
  if (typeof department !== "string" || !allowed.includes(department))
    throw new Error(
      "This work template does not allow the requested department",
    );
  return department;
}
