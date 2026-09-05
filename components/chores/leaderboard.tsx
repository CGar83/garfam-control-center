"use client";

import { Trophy } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { paletteForMember } from "@/lib/member-colors";
import { pointsThisWeek } from "@/lib/streaks";
import type { ChoreCompletion, FamilyMember } from "@/lib/types";
import { memberFirstName, weeklyPointsHistory } from "./helpers";

interface LeaderboardProps {
  members: FamilyMember[];
  kids: FamilyMember[];
  completions: ChoreCompletion[];
  today: Date;
}

export function Leaderboard({ members, kids, completions, today }: LeaderboardProps) {
  if (kids.length === 0) return null;

  if (kids.length === 1) {
    const kid = kids[0];
    const palette = paletteForMember(kid, members);
    const history = weeklyPointsHistory(completions, kid.id, 8, today);
    const thisWeek = history[history.length - 1] ?? 0;
    const best = Math.max(...history.slice(0, -1), 0);
    const beating = thisWeek > best && thisWeek > 0;
    const max = Math.max(...history, 1);
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" />
            Personal best
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3">
            <MemberAvatar member={kid} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {memberFirstName(kid)}: <span style={{ color: palette.ink }}>{thisWeek} pts</span> this week
              </p>
              <p className="text-xs text-muted-foreground">{beating ? "New personal best! 🎉" : best > 0 ? `Best week so far: ${best} pts` : "First week on the board."}</p>
            </div>
          </div>
          <div className="mt-3 flex h-12 items-end gap-1" role="img" aria-label={`Weekly points for the last 8 weeks: ${history.join(", ")}`}>
            {history.map((points, index) => (
              <span
                key={index}
                className="flex-1 rounded-t-md transition-all"
                style={{ height: `${Math.max(6, (points / max) * 100)}%`, backgroundColor: index === history.length - 1 ? palette.solid : palette.border }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const ranked = kids
    .map((kid) => ({ kid, points: pointsThisWeek(completions, kid.id, today) }))
    .sort((a, b) => b.points - a.points);
  const top = ranked[0]?.points ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-amber-500" />
          This week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {ranked.map(({ kid, points }, index) => {
          const palette = paletteForMember(kid, members);
          const leader = index === 0 && points > 0;
          return (
            <div key={kid.id} className="flex items-center gap-3">
              <MemberAvatar member={kid} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-semibold">
                    {memberFirstName(kid)} {leader ? <span aria-label="leading this week">👑</span> : null}
                  </span>
                  <span className="tabular-nums" style={{ color: palette.ink }}>
                    {points} pts
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${top > 0 ? Math.max(4, (points / top) * 100) : 4}%`, backgroundColor: palette.solid }} />
                </div>
              </div>
            </div>
          );
        })}
        <p className="pt-1 text-xs text-muted-foreground">Everyone who finishes their list wins. Points reset the leaderboard each Sunday.</p>
      </CardContent>
    </Card>
  );
}
