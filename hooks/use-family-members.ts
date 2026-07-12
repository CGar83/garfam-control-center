"use client";

import { useAppData } from "@/components/app/providers";

export function useFamilyMembers() {
  const { data, familyId } = useAppData();
  const members = data.family_members.filter((member) => member.family_id === familyId);

  return {
    members,
    parents: members.filter((member) => member.role === "admin" || member.role === "parent"),
    children: members.filter((member) => member.relationship?.toLowerCase().includes("child")),
    findMember: (id?: string | null) => members.find((member) => member.id === id)
  };
}
