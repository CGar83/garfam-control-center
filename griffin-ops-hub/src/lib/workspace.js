import {
  isQueueStageForRole,
  isOverrideRole,
  STAGE_OWNER_ROLE,
} from "./stages.js";
import { stageEnteredAt } from "./reports.js";

export async function loadWorkspace(
  db,
  { now = new Date().toISOString() } = {},
) {
  const [worksheets, loans, profiles, schema, investors] = await Promise.all([
    db.listWorksheets(),
    db.listLoans(),
    db.listProfiles(),
    db.getSchema("DSCR"),
    db.getInvestorData(),
  ]);
  const loanMap = Object.fromEntries(loans.map((l) => [l.loan_number, l]));
  const names = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]));
  const activities = await Promise.all(
    worksheets.map((w) => db.getActivity(w.id)),
  );
  const rows = worksheets.map((w, i) => {
    const activity = activities[i];
    const stageAt = stageEnteredAt(w, activity.transitions, now);
    const latest = activity.transitions.find(
      (t) => t.to_stage === w.stage && t.at === stageAt,
    );
    const loan = loanMap[w.loan_number] || {};
    const ownerRole = STAGE_OWNER_ROLE[w.stage];
    const ownerId =
      ownerRole === "LO"
        ? loan.lo_id
        : ownerRole === "MLP"
          ? loan.mlp_id
          : loan.processor_id;
    return {
      ...w,
      loan,
      activity,
      names,
      ownerRole,
      owner: names[ownerId] || "Unassigned",
      hours: stageAt ? (new Date(now) - new Date(stageAt)) / 36e5 : null,
      stageAt,
      latestNote: latest?.note,
      investor: investors.byId[w.data?.pr],
    };
  });
  return { rows, loans, profiles, names, schema, investors };
}
export function isMyWork(row, profile) {
  if (!isQueueStageForRole(row.stage, profile.role)) return false;
  if (isOverrideRole(profile.role)) return true;
  if (profile.role === "LO")
    return row.loan.lo_id === profile.id || row.created_by === profile.id;
  if (profile.role === "LOA")
    return (
      row.loan.lo_id === profile.assists_lo_id || row.created_by === profile.id
    );
  if (profile.role === "MLP")
    return !row.loan.mlp_id || row.loan.mlp_id === profile.id;
  if (profile.role === "PROCESSOR")
    return !row.loan.processor_id || row.loan.processor_id === profile.id;
  return false;
}
export function attentionFor(row) {
  if (row.stage === "COMPLETE") return { label: "Complete", kind: "ok" };
  if (row.stage.startsWith("RETURNED"))
    return { label: "Returned", kind: "warn" };
  if (row.hours >= 48) return { label: "48h+ in stage", kind: "warn" };
  if (!row.owner || row.owner === "Unassigned")
    return { label: "Unassigned", kind: "muted" };
  return { label: "In progress", kind: "muted" };
}
