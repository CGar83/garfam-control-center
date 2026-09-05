"use client";

import { useAppData } from "@/components/app/providers";
import { isChildMember } from "@/lib/family-members";

export function useFamilyMembers() {
  const { data, familyId } = useAppData();
  const members = data.family_members.filter((member) => member.family_id === familyId);

  return {
    members,
    parents: members.filter((member) => member.role === "admin" || member.role === "parent"),
    children: members.filter(isChildMember),
    findMember: (id?: string | null) => members.find((member) => member.id === id)
  };
}
