import { missingFields, visibleFields } from "./operations.js";

// Presentation only: never change the pinned template, its sequence, or values.
export function sectionReadiness(template, data = {}) {
  const fields = visibleFields(template, data);
  const missing = new Set(
    missingFields(template, data).map((field) => field.key),
  );
  return template.sections.map((section) => {
    const required = fields.filter(
      (field) => field.sectionId === section.id && field.required,
    );
    return {
      id: section.id,
      total: required.length,
      done: required.filter((field) => !missing.has(field.key)).length,
    };
  });
}

export function findFormFields(template, data, query) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return [];
  return visibleFields(template, data).filter((field) =>
    [field.label, field.section, field.hint || ""]
      .join(" ")
      .toLocaleLowerCase()
      .includes(term),
  );
}
