import type { AccessSection, FamilyMember } from "@/lib/types";

export const accessSections: Array<{
  key: AccessSection;
  label: string;
  description: string;
}> = [
  { key: "finances", label: "Finances", description: "Budgets, bills, transactions, credit cards, and account overviews." },
  { key: "accounts", label: "Accounts", description: "Login locations, recovery notes, and account reference records." },
  { key: "health", label: "Health", description: "Providers, medications, appointments, insurance references, and health notes." },
  { key: "documents", label: "Documents", description: "Family document library, renewal notes, and storage references." },
  { key: "contacts", label: "Contacts", description: "Private family contacts, contractors, doctors, and emergency contacts." },
  { key: "communication", label: "Communication", description: "Parent-to-parent bulletin board and acknowledgment notes." },
  { key: "relationship", label: "Relationship", description: "Marriage check-ins, repair notes, and relationship health records." },
  { key: "emergency", label: "Emergency", description: "Emergency plans, medical summaries, pickup authorization, and shutoff notes." }
];

const routeSections: Array<{ path: string; section: AccessSection }> = [
  { path: "/budget", section: "finances" },
  { path: "/bills", section: "finances" },
  { path: "/finances", section: "finances" },
  { path: "/accounts", section: "accounts" },
  { path: "/health", section: "health" },
  { path: "/documents", section: "documents" },
  { path: "/contacts", section: "contacts" },
  { path: "/communication", section: "communication" },
  { path: "/relationship", section: "relationship" },
  { path: "/emergency", section: "emergency" }
];

function cleanPath(pathname: string) {
  return pathname.split("?")[0]?.split("#")[0] || "/";
}

export function blockedSectionForPath(pathname: string): AccessSection | null {
  const path = cleanPath(pathname);
  const match = routeSections.find((route) => path === route.path || path.startsWith(`${route.path}/`));
  return match?.section ?? null;
}

export function memberCanAccessSection(member: FamilyMember | null | undefined, section: AccessSection | null) {
  if (!section) return true;
  if (!member) return true;
  if (member.role === "admin" || member.role === "parent") return true;
  return !(member.blocked_sections ?? []).includes(section);
}

export function memberCanAccessPath(member: FamilyMember | null | undefined, pathname: string) {
  return memberCanAccessSection(member, blockedSectionForPath(pathname));
}
