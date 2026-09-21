export const WORK_STATUSES = [
  "DRAFT",
  "QUEUED",
  "IN_PROGRESS",
  "BLOCKED",
  "REVIEW",
  "COMPLETE",
  "CANCELLED",
];
export const WORK_PRIORITIES = ["NORMAL", "HIGH", "URGENT"];
export const departmentRole = (department, role) =>
  role === department || (department === "LO" && role === "LOA");
export function workManager(item, profile) {
  return (
    profile?.active !== false &&
    (profile?.role === "ADMIN" ||
      (profile?.role === "MANAGER" &&
        !!profile.branch &&
        profile.branch === item.branch))
  );
}
export function workContributor(item, profile) {
  if (!profile || profile.active === false || profile.role === "PENDING")
    return false;
  return (
    departmentRole(item.department, profile.role) &&
    !!profile.branch &&
    profile.branch === item.branch &&
    (!item.owner_id || item.owner_id === profile.id)
  );
}
export function canEditWork(item, profile) {
  if (!item || !profile || ["COMPLETE", "CANCELLED"].includes(item.status))
    return false;
  return (
    workManager(item, profile) ||
    workContributor(item, profile) ||
    (profile.active !== false &&
      item.created_by === profile.id &&
      ["DRAFT", "QUEUED", "BLOCKED"].includes(item.status))
  );
}
export function allowedWorkStatuses(item, profile) {
  if (
    !item ||
    !profile ||
    profile.active === false ||
    profile.role === "PENDING"
  )
    return [];
  const manager = workManager(item, profile);
  const department = workContributor(item, profile);
  const requester = item.created_by === profile.id;
  const paths = {
    DRAFT: ["QUEUED", "CANCELLED"],
    QUEUED: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
    IN_PROGRESS: ["BLOCKED", "REVIEW", "CANCELLED"],
    BLOCKED: ["QUEUED", "IN_PROGRESS", "CANCELLED"],
    REVIEW: ["COMPLETE", "IN_PROGRESS", "BLOCKED", "CANCELLED"],
    COMPLETE: ["IN_PROGRESS"],
    CANCELLED: ["DRAFT"],
  };
  return (paths[item.status] || []).filter((to) => {
    if (to === "COMPLETE") return department;
    if (["COMPLETE", "CANCELLED"].includes(item.status))
      return manager || department;
    if (manager || department) return true;
    return (
      requester &&
      (to === "CANCELLED" ||
        (item.status === "DRAFT" && to === "QUEUED") ||
        (item.status === "BLOCKED" && to === "QUEUED"))
    );
  });
}
export const workNoteRequired = (item, to) =>
  ["BLOCKED", "CANCELLED"].includes(to) ||
  ["COMPLETE", "CANCELLED"].includes(item.status);
