// Internal normalized contract only. Vendor authentication and mapping must happen
// before calling this validator. This module does not receive or send network traffic.
const SOURCES = new Set(["lendingpad", "hubspot", "lia"]);
const TYPES = new Set([
  "loan.milestone_observed",
  "crm.association_observed",
  "lia.touchpoint_observed",
]);
const EXPECTED_SOURCE = {
  "loan.milestone_observed": "lendingpad",
  "crm.association_observed": "hubspot",
  "lia.touchpoint_observed": "lia",
};
const KEYS = new Set([
  "contract_version",
  "environment",
  "source_system",
  "source_event_id",
  "event_type",
  "source_loan_id",
  "hub_loan_number",
  "occurred_at",
  "observed_at",
  "correlation_id",
  "payload",
]);
const requiredString = (value, key) => {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 200 ||
    Array.from(value).some((char) => char.charCodeAt(0) < 32)
  )
    throw new Error(`Invalid ${key}`);
  return value;
};
export function validateNormalizedEvent(
  event,
  { now = new Date(), maxFutureSkewMs = 300000 } = {},
) {
  if (!event || typeof event !== "object" || Array.isArray(event))
    throw new Error("Event must be an object");
  if (Object.keys(event).some((k) => !KEYS.has(k)))
    throw new Error("Unexpected event property");
  if (event.contract_version !== 1)
    throw new Error("Unsupported contract version");
  if (!["sandbox", "production"].includes(event.environment))
    throw new Error("Explicit environment is required");
  if (
    !SOURCES.has(event.source_system) ||
    !TYPES.has(event.event_type) ||
    EXPECTED_SOURCE[event.event_type] !== event.source_system
  )
    throw new Error("Source and event type must match");
  for (const key of [
    "source_event_id",
    "source_loan_id",
    "hub_loan_number",
    "correlation_id",
  ])
    requiredString(event[key], key);
  for (const key of ["occurred_at", "observed_at"])
    if (
      typeof event[key] !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(event[key]) ||
      !Number.isFinite(Date.parse(event[key])) ||
      new Date(event[key]).toISOString() !==
        event[key].replace(/(?<!\.\d{3})Z$/, ".000Z") ||
      Date.parse(event[key]) > new Date(now).getTime() + maxFutureSkewMs
    )
      throw new Error(`Invalid ${key}`);
  if (Date.parse(event.occurred_at) > Date.parse(event.observed_at))
    throw new Error("Observation cannot precede the source event");
  if (
    !event.payload ||
    typeof event.payload !== "object" ||
    Array.isArray(event.payload) ||
    JSON.stringify(event.payload).length > 2000
  )
    throw new Error("Invalid payload");
  const allow = {
    "loan.milestone_observed": ["milestone"],
    "crm.association_observed": ["contact_id", "deal_id"],
    "lia.touchpoint_observed": ["session_id", "touchpoint_id", "actor_id"],
  }[event.event_type];
  if (
    Object.keys(event.payload).some((k) => !allow.includes(k)) ||
    allow.some((k) => !Object.hasOwn(event.payload, k))
  )
    throw new Error("Payload must match its event contract");
  allow.forEach((k) => requiredString(event.payload[k], k));
  return structuredClone(event);
}
export function eventIdempotencyKey(event) {
  const checked = validateNormalizedEvent(event);
  return JSON.stringify([
    checked.environment,
    checked.source_system,
    checked.source_event_id,
  ]);
}
export function requireVerifiedLoanBinding(event, binding) {
  const checked = validateNormalizedEvent(event);
  if (
    !binding ||
    binding.verified !== true ||
    binding.environment !== checked.environment ||
    binding.source_system !== checked.source_system ||
    binding.source_loan_id !== checked.source_loan_id ||
    binding.hub_loan_number !== checked.hub_loan_number
  )
    throw new Error("A verified exact loan binding is required");
  return checked;
}
