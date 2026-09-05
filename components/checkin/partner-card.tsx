"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircleHeart, Moon } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { useAppData } from "@/components/app/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useToast } from "@/hooks/use-toast";
import { firstName, paletteForMember } from "@/lib/member-colors";
import { dateKey } from "@/lib/streaks";
import type { Checkin, FamilyMember } from "@/lib/types";
import { parseMaybeDate } from "@/lib/utils";
import { energyLabel, moodFace, moodLabel } from "@/components/checkin/helpers";
import { EnergyBars } from "@/components/checkin/pickers";

interface PartnerCardProps {
  partner: FamilyMember;
  checkin: Checkin | null;
  checkedInToday: boolean;
}

export function PartnerCard({ partner, checkin, checkedInToday }: PartnerCardProps) {
  const { createRecord, currentMemberId } = useAppData();
  const { members } = useFamilyMembers();
  const { toast } = useToast();
  const [sent, setSent] = useState<"ack" | "talk" | null>(null);
  const palette = paletteForMember(partner, members);
  const name = firstName(partner.display_name);

  async function respond(kind: "ack" | "talk") {
    if (!checkin) return;
    const message =
      kind === "ack"
        ? `Saw your check-in (${moodLabel(checkin.mood).toLowerCase()}, ${energyLabel(checkin.energy).toLowerCase()} energy). I'm with you. 💛${checkin.needs ? ` Heard: "${checkin.needs}"` : ""}`
        : `Let's talk tonight after the kids are down.${checkin.needs ? ` I want to hear more about "${checkin.needs}".` : " Twenty minutes, outside stress only."}`;
    try {
      await createRecord("communication_notes", {
        title: `Re: ${name}'s check-in`,
        message,
        category: "Reminder",
        importance: "medium",
        related_date: dateKey(new Date()),
        visible_to: partner.id,
        acknowledged_by: [],
        created_by: currentMemberId,
        pinned: false
      });
      setSent(kind);
      toast({
        title: kind === "ack" ? `Sent ${name} a little 💛` : "Tonight is on the board",
        description: kind === "ack" ? "A note landed on the family board." : `${name} will see the note on the family board.`,
        variant: "success"
      });
    } catch (error) {
      toast({ title: "Could not send", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  }

  if (!checkin) {
    return (
      <Card className="fade-up fade-up-delay-1 border-dashed">
        <CardContent className="flex items-center gap-4 p-5">
          <MemberAvatar member={partner} size="lg" />
          <div className="min-w-0">
            <p className="text-base font-semibold">{name} hasn&apos;t checked in yet</p>
            <p className="mt-0.5 text-sm text-muted-foreground">No pressure. A six-second hug counts as a check-in too.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const updatedAt = parseMaybeDate(checkin.updated_at) ?? parseMaybeDate(checkin.checkin_date);
  const when = updatedAt ? formatDistanceToNow(updatedAt, { addSuffix: true }) : checkin.checkin_date;

  return (
    <Card className="fade-up fade-up-delay-1 overflow-hidden border-l-4" style={{ borderLeftColor: palette.solid }}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <MemberAvatar member={partner} size="lg" />
            <div>
              <p className="text-base font-semibold">{name}&apos;s check-in</p>
              <p className="text-xs text-muted-foreground">
                {checkedInToday ? "Today" : "Latest"} · {when}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ backgroundColor: palette.soft, color: palette.ink }}>
            <span className="text-3xl leading-none" aria-hidden>
              {moodFace(checkin.mood)}
            </span>
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight">{moodLabel(checkin.mood)}</p>
              <p className="flex items-center justify-end gap-1.5 text-[11px] font-medium leading-tight">
                <EnergyBars value={checkin.energy} />
                {energyLabel(checkin.energy)}
              </p>
            </div>
          </div>
        </div>

        {!checkedInToday ? <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">Nothing from {name} yet today. This is from {checkin.checkin_date}.</p> : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grateful for</p>
            <p className="text-wrap-safe mt-1 text-sm leading-6">{checkin.gratitude || "—"}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Needs</p>
            <p className="text-wrap-safe mt-1 text-sm leading-6">{checkin.needs || "Nothing named today"}</p>
          </div>
          {checkin.note ? (
            <div className="rounded-xl bg-muted/50 p-3 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Note</p>
              <p className="text-wrap-safe mt-1 text-sm leading-6">{checkin.note}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant={sent === "ack" ? "secondary" : "outline"} className="h-11 flex-1" onClick={() => void respond("ack")} disabled={sent === "ack"}>
            <Heart className="h-4 w-4 text-primary" />
            {sent === "ack" ? "Acknowledged" : "Acknowledge 💛"}
          </Button>
          <Button variant={sent === "talk" ? "secondary" : "outline"} className="h-11 flex-1" onClick={() => void respond("talk")} disabled={sent === "talk"}>
            {sent === "talk" ? <MessageCircleHeart className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {sent === "talk" ? "Tonight it is" : "Let's talk tonight"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
