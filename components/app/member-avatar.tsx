"use client";

import { UserRound } from "lucide-react";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { memberInitials, paletteForMember } from "@/lib/member-colors";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  member?: FamilyMember | null;
  memberId?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}

const sizeClasses = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-lg"
};

/** Color-coded initials avatar. Pass either a member or an id. */
export function MemberAvatar({ member, memberId, size = "md", className, ring }: MemberAvatarProps) {
  const { members, findMember } = useFamilyMembers();
  const resolved = member ?? findMember(memberId);
  const palette = paletteForMember(resolved, members);

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold", sizeClasses[size], ring && "ring-2 ring-white dark:ring-card", className)}
      style={{ backgroundColor: palette.solid, color: palette.onSolid }}
      title={resolved?.display_name ?? "Unassigned"}
      aria-label={resolved?.display_name ?? "Unassigned"}
    >
      {resolved ? memberInitials(resolved.display_name) : <UserRound className="h-[55%] w-[55%]" />}
    </span>
  );
}

/** Overlapping avatars for shared items. */
export function MemberAvatarStack({ memberIds, size = "sm", max = 4 }: { memberIds: string[]; size?: "xs" | "sm" | "md"; max?: number }) {
  const shown = memberIds.slice(0, max);
  const extra = memberIds.length - shown.length;
  if (shown.length === 0) return null;
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {shown.map((id) => (
        <MemberAvatar key={id} memberId={id} size={size} ring />
      ))}
      {extra > 0 ? (
        <span className={cn("inline-flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-white dark:ring-card", sizeClasses[size])}>
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

/** Pill-shaped filter chip for a member. */
export function MemberChip({
  member,
  active,
  onClick,
  size = "md"
}: {
  member: FamilyMember | null;
  active: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  const { members } = useFamilyMembers();
  const palette = paletteForMember(member, members);
  const label = member ? member.display_name.split(" ")[0] : "Everyone";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border font-semibold transition-all focus-ring",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-3 text-sm",
        active ? "shadow-sm" : "border-border bg-white/70 text-muted-foreground hover:border-foreground/20 dark:bg-white/5"
      )}
      style={active ? { backgroundColor: member ? palette.soft : "hsl(var(--foreground))", borderColor: member ? palette.border : "transparent", color: member ? palette.ink : "hsl(var(--background))" } : undefined}
    >
      {member ? <MemberAvatar member={member} size="xs" /> : null}
      {label}
    </button>
  );
}
