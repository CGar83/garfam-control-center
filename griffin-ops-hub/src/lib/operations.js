import templates from "../data/operationsTemplates.json";
import { workRuleFailures } from "./workRules.js";

export const WORK_STATUS_LABEL = Object.freeze({
  DRAFT: "Draft",
  QUEUED: "Queued",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  REVIEW: "Ready for review",
  COMPLETE: "Complete",
  CANCELLED: "Cancelled",
});

export function templateById(id) {
  const template = templates.find((candidate) => candidate.id === id);
  return template ? structuredClone(template) : null;
}

function conditionMatches(condition, data) {
  if (!condition) return true;
  if (Object.hasOwn(condition, "equals"))
    return data[condition.key] === condition.equals;
  if (Array.isArray(condition.in))
    return condition.in.includes(data[condition.key]);
  // An unknown condition must not silently hide required work.
  return true;
}

export function visibleFields(template, data = {}) {
  return (template?.sections || []).flatMap((section) =>
    (section.fields || [])
      .filter((field) => conditionMatches(field.showWhen, data))
      .map((field) => ({
        ...field,
        section: section.title,
        sectionId: section.id,
      })),
  );
}

function answered(field, value) {
  if (field.type === "checkbox") return value === true;
  if (value === undefined || value === null || typeof value === "boolean")
    return false;
  if (!["string", "number"].includes(typeof value)) return false;
  const text = String(value).trim();
  if (!text) return false;
  if (field.maxLength != null && String(value).length > field.maxLength)
    return false;
  if (field.type === "select") return (field.options || []).includes(value);
  if (field.type === "number") {
    if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(text)) return false;
    const number = Number(text);
    if (!Number.isFinite(number)) return false;
    if (field.min != null && number < field.min) return false;
    if (field.exclusiveMin != null && number <= field.exclusiveMin)
      return false;
    if (
      field.precision != null &&
      (text.split(".")[1]?.length || 0) > field.precision
    )
      return false;
    return true;
  }
  if (field.type === "date") {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
      !Number.isFinite(Date.parse(text)) ||
      new Date(text).toISOString().slice(0, 10) !== text
    )
      return false;
    const year = Number(text.slice(0, 4));
    return (
      !(field.minYear != null && year < field.minYear) &&
      !(field.maxYear != null && year > field.maxYear)
    );
  }
  return true;
}

export function missingFields(template, data = {}) {
  return visibleFields(template, data).filter(
    (field) => field.required && !answered(field, data[field.key]),
  );
}

export function workProgress(item = {}) {
  const template = item.template_snapshot || templateById(item.template_id);
  if (!template?.sections)
    return {
      done: 0,
      total: 0,
      percent: 0,
      missing: [
        {
          key: "template",
          label: "The pinned workflow template is unavailable.",
          section: "Workflow template",
          kind: "template",
        },
      ],
    };
  const data = item.data || {};
  const fields = visibleFields(template, data).filter(
    (field) => field.required,
  );
  const checks = (template.checklist || []).filter((check) => check.required);
  const ruleFailures = workRuleFailures(template, data);
  const missing = [
    ...ruleFailures,
    ...missingFields(template, data).map((field) => ({
      ...field,
      kind: "field",
    })),
    ...checks
      .filter((check) => item.checks?.[check.id] !== true)
      .map((check) => ({
        ...check,
        key: check.id,
        section: "Completion checklist",
        kind: "check",
      })),
  ];
  const total = fields.length + checks.length + ruleFailures.length;
  const done = total - missing.length;
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 100,
    missing,
  };
}

// These are source-provided review prompts, never eligibility or completion gates.
export function workReviewItems(item = {}) {
  const template = item.template_snapshot || templateById(item.template_id);
  const fields = visibleFields(template, item.data || {});
  const data = item.data || {};
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  const reviews = [];
  const add = (key, label, detail) => {
    const field = fieldByKey.get(key);
    if (field) reviews.push({ key, label, detail, sectionId: field.sectionId });
  };
  if (template?.id === "LOA_PREP") {
    fields
      .filter(
        (field) => /^flags_\d+$/.test(field.key) && data[field.key] === true,
      )
      .forEach((field) =>
        add(
          field.key,
          field.label,
          "Explicitly flagged by the preparer. A human must assess the context.",
        ),
      );
  }
  if (template?.id !== "CD_REQUEST") return reviews;
  const prompts = [
    ["addressMatch", "No", "Property address differs from appraisal"],
    ["amountMatch", "No", "Loan amount differs from last Loan Estimate"],
    ["rateMatch", "No", "Interest rate differs from last Loan Estimate"],
    ["mlp", "No", "MLP has not been confirmed"],
    ["mailAway", "Yes", "Mail-away signing"],
    ["splitSigning", "Yes", "Split signing"],
    ["poa", "Yes", "Power of attorney"],
    ["newDeed", "Yes", "New deed"],
    ["nbs", "Yes", "Non-borrowing spouse"],
    ["escrowWaived", "Yes", "Escrow waived"],
    ["floodZone", "Yes", "Flood zone"],
    ["hpml", "Yes", "HPML"],
    ["appraisalType", "Subject to", "Appraisal is subject to conditions"],
  ];
  prompts.forEach(([key, value, label]) => {
    if (data[key] === value)
      add(
        key,
        label,
        "Imported reference prompt. Verify current requirements and coordinate the next step with the responsible team.",
      );
  });
  for (const key of [
    "creditInvoice",
    "hoiInvoice",
    "taxCert",
    "cdaInvoice",
    "appraisalInvoice",
    "secondInvoice",
  ]) {
    const field = fieldByKey.get(key);
    if (field && (data[key] === "Pending" || !String(data[key] ?? "").trim())) {
      add(
        key,
        `${field.label}: ${data[key] === "Pending" ? "pending" : "status not recorded"}`,
        "Confirm document availability or record why it is not applicable. This is not an invoice upload or delivery confirmation.",
      );
    }
  }
  const dateValue = (key) => {
    const value = data[key],
      field = fieldByKey.get(key);
    return field?.type === "date" && answered(field, value)
      ? String(value)
      : null;
  };
  const closing = dateValue("closingDate"),
    disbursement = dateValue("disbursementDate");
  const firstPayment = dateValue("firstPayment"),
    insurance = dateValue("insuranceDate"),
    appraisal = dateValue("appraisalSent");
  const dateDetail =
    "Date sequence requires human review. No business-day, regulatory, rescission, or eligibility calculation has been applied.";
  if (disbursement && closing && disbursement < closing)
    add("disbursementDate", "Disbursement is before closing", dateDetail);
  if (firstPayment && disbursement && firstPayment <= disbursement)
    add(
      "firstPayment",
      "First payment is on or before disbursement",
      dateDetail,
    );
  if (insurance && closing && insurance > closing)
    add(
      "insuranceDate",
      "Insurance effective date is after closing",
      dateDetail,
    );
  if (appraisal && closing && appraisal > closing)
    add("appraisalSent", "Appraisal sent date is after closing", dateDetail);
  return reviews;
}
