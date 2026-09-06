"use client";

import { Check, ChevronDown, UsersRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/app/member-avatar";
import { useAppData } from "@/components/app/providers";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * "Who's using this?" switcher for a shared kitchen tablet. Switching to a kid
 * applies that kid's access restrictions and personalizes Today.
 */
export function MemberSwitcher({ className }: { className?: string }) {
  const { currentMember, switchMember, usingLocalData, currentUser } = useAppData();
  const { members } = useFamilyMembers();
  const { toast } = useToast();
  const canSwitch = usingLocalData || currentUser.role === "admin" || currentUser.role === "parent";
  if (!canSwitch || members.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border border-border/80 bg-white/70 pl-1 pr-2.5 text-sm font-medium shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-all hover:border-primary/30 focus-ring dark:bg-white/5",
            className
          )}
          aria-label="Switch family member"
        >
          <MemberAvatar member={currentMember} size="sm" />
          <span className="hidden max-w-[7rem] truncate sm:inline">{currentMember?.display_name.split(" ")[0] ?? "Family"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <UsersRound className="h-3.5 w-3.5" />
          Who is using this?
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {members.map((member) => {
          const active = member.id === currentMember?.id;
          return (
            <DropdownMenuItem
              key={member.id}
              className="gap-3 rounded-xl py-2"
              onSelect={() => {
                switchMember(member.id);
                toast({ title: `Hi, ${member.display_name.split(" ")[0]}`, description: "Today is now personalized for you." });
              }}
            >
              <MemberAvatar member={member} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{member.display_name}</span>
                <span className="block text-xs text-muted-foreground">{member.relationship ?? member.role}</span>
              </span>
              {active ? <Check className="h-4 w-4 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
