// This module relates already-authorized work to a reference playbook. It never
// infers LOS milestones, verifies an external event, or completes a journey step.
export function journeyLoans(loans = [], items = []) {
  const allowed = new Map();
  for (const record of [...items, ...loans]) {
    if (!record?.loan_number) continue;
    allowed.set(record.loan_number, {
      loan_number: record.loan_number,
      borrower_last:
        record.borrower_last ||
        allowed.get(record.loan_number)?.borrower_last ||
        "",
    });
  }
  return [...allowed.values()].sort((a, b) =>
    a.loan_number.localeCompare(b.loan_number),
  );
}

export function relatedJourneyWork(step, items = [], loanNumber = "") {
  if (!step?.templateId || !loanNumber) return [];
  return items
    .filter(
      (item) =>
        item.loan_number === loanNumber && item.template_id === step.templateId,
    )
    .sort((a, b) =>
      String(b.updated_at || "").localeCompare(String(a.updated_at || "")),
    );
}

export function journeyStartLink(templateId, loanNumber = "") {
  const params = new URLSearchParams({ create: "1", template: templateId });
  if (loanNumber) params.set("loan", loanNumber);
  return `/operations?${params}`;
}

export function filterJourneySteps(steps = [], role = "all", query = "") {
  const term = query.trim().toLowerCase();
  return steps.filter(
    (step) =>
      (role === "all" || step.owner === role) &&
      [
        step.title,
        step.owner,
        step.action,
        step.prerequisite,
        step.evidence,
        step.nextOwner,
        step.system,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
  );
}
