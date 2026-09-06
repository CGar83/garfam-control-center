"use client";

import { Flame, Star } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { ProgressRing } from "@/components/app/progress-ring";
import { Card, CardContent } from "@/components/ui/card";
import { paletteForMember } from "@/lib/member-colors";
import { choreProgressForDay, choreStreak, pointsBalance, pointsThisWeek } from "@/lib/streaks";
import type { Chore, ChoreCompletion, FamilyMember, RewardClaim } from "@/lib/types";
import { cn } from "@/lib/utils";
import { memberFirstName } from "./helpers";

interface KidHeroCardProps {
  member: FamilyMember;
  members: FamilyMember[];
  chores: Chore[];
  completions: ChoreCompletion[];
  claims: RewardClaim[];
  today: Date;
  featured?: boolean;
}

export function KidHeroCard({ member, members, chores, completions, claims, today, featured }: KidHeroCardProps) {
  const palette = paletteForMember(member, members);
  const progress = choreProgressForDay(chores, completions, member.id, today);
  const balance = pointsBalance(completions, claims, member.id);
  const streak = choreStreak(chores, completions, member.id, today);
  const weekPoints = pointsThisWeek(completions, member.id, today);
  const name = memberFirstName(member);

  return (
    <Card
      className={cn("relative overflow-hidden border-l-4", featured && "sm:col-span-2")}
      style={{ borderLeftColor: palette.solid, backgroundColor: featured ? palette.soft : undefined }}
    >
      <CardContent className={cn("flex items-center gap-4", featured ? "p-5 sm:p-6" : "p-4")}>
        <ProgressRing value={progress.percent} size={featured ? 92 : 68} stroke={featured ? 9 : 7} color={palette.solid} label={`${name}: ${progress.percent} percent of today's chores done`}>
          <MemberAvatar member={member} size={featured ? "lg" : "md"} ring />
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className={cn("truncate font-semibold", featured ? "text-2xl" : "text-lg")} style={featured ? { color: palette.ink } : undefined}>
              {name}
            </h3>
            <span className={cn("text-sm", featured ? "opacity-80" : "text-muted-foreground")} style={featured ? { color: palette.ink } : undefined}>
              {progress.due.length === 0 ? "Nothing due today" : `${progress.done.length} of ${progress.due.length} done`}
            </span>
          </div>
          <div className={cn("mt-2 flex flex-wrap items-center gap-2", featured ? "text-sm" : "text-xs")}>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold"
              style={{ backgroundColor: featured ? "rgba(255,255,255,0.7)" : palette.soft, color: palette.ink }}
            >
              <Star className="h-3.5 w-3.5" aria-hidden />
              {balance} pts
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
                streak > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "bg-muted text-muted-foreground"
              )}
              title="Days in a row with every chore done"
            >
              <Flame className="h-3.5 w-3.5" aria-hidden />
              {streak} day{streak === 1 ? "" : "s"}
            </span>
            <span
              className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium", !featured && "bg-muted text-muted-foreground")}
              style={featured ? { backgroundColor: "rgba(255,255,255,0.7)", color: palette.ink } : undefined}
            >
              +{weekPoints} this week
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
