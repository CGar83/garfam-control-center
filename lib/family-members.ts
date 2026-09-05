import { differenceInYears, isValid, parseISO } from "date-fns";
import type { ActivityAudience, FamilyMember } from "@/lib/types";

export function getMemberAge(member: FamilyMember, today = new Date()) {
  if (member.birthdate) {
    const birthdate = parseISO(member.birthdate);
    if (isValid(birthdate)) return differenceInYears(today, birthdate);
  }

  const match = member.age_label?.match(/\d{1,3}/);
  return match ? Number(match[0]) : null;
}

export function getMemberAgeLabel(member: FamilyMember) {
  const age = getMemberAge(member);
  if (age !== null) return `${age}`;
  return member.age_label?.trim() || "Age not set";
}

export function isChildMember(member: FamilyMember) {
  const relationship = member.relationship?.toLowerCase() ?? "";
  const age = getMemberAge(member);

  return (
    relationship.includes("child") ||
    relationship.includes("kid") ||
    relationship.includes("teen") ||
    relationship.includes("son") ||
    relationship.includes("daughter") ||
    (age !== null && age < 18)
  );
}

export function childAudience(member: FamilyMember): ActivityAudience {
  const relationship = member.relationship?.toLowerCase() ?? "";
  if (relationship.includes("son")) return "son";
  if (relationship.includes("daughter")) return "daughter";
  return "all_kids";
}
