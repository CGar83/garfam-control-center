"use client";

import { UserRound } from "lucide-react";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { cn } from "@/lib/utils";

interface PersonAvatarProps {
  personId?: string | null;
  showName?: boolean;
  size?: "sm" | "md";
}

export function PersonAvatar({ personId, showName = true, size = "md" }: PersonAvatarProps) {
  const { findMember } = useFamilyMembers();
  const member = findMember(personId);
  const initials =
    member?.display_name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground",
          size === "sm" ? "h-6 w-6" : "h-8 w-8"
        )}
      >
        {member ? initials : <UserRound className="h-4 w-4" />}
      </span>
      {showName ? <span className="truncate text-sm">{member?.display_name ?? "Unassigned"}</span> : null}
    </span>
  );
}
