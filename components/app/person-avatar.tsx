"use client";

import { MemberAvatar } from "@/components/app/member-avatar";
import { useFamilyMembers } from "@/hooks/use-family-members";

interface PersonAvatarProps {
  personId?: string | null;
  showName?: boolean;
  size?: "sm" | "md";
}

export function PersonAvatar({ personId, showName = true, size = "md" }: PersonAvatarProps) {
  const { findMember } = useFamilyMembers();
  const member = findMember(personId);

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <MemberAvatar member={member} size={size === "sm" ? "sm" : "md"} />
      {showName ? <span className="truncate text-sm">{member?.display_name ?? "Unassigned"}</span> : null}
    </span>
  );
}
