"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowRight, HeartHandshake, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { MemberAvatar } from "@/components/app/member-avatar";
import { PageHeader } from "@/components/app/page-header";
import { useAppData } from "@/components/app/providers";
import { CheckinForm } from "@/components/checkin/checkin-form";
import { bothAboveStreak, buildTrend, checkinFor, latestSharedCheckin, moodFace, openNeeds, recentConnectionScore, recentGratitude, trendDays } from "@/components/checkin/helpers";
import { MoodTrendChart } from "@/components/checkin/mood-trend-chart";
import { PartnerCard } from "@/components/checkin/partner-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { firstName, paletteForMember } from "@/lib/member-colors";
import { checkinStreak } from "@/lib/streaks";
import type { Checkin, RelationshipRecord } from "@/lib/types";

export default function CheckinPage() {
  const { currentMember, currentMemberId } = useAppData();
  const { members, parents } = useFamilyMembers();
  const checkins = useRealtimeTable("checkins") as Checkin[];
  const relationshipRecords = useRealtimeTable("relationship_records") as RelationshipRecord[];

  const today = useMemo(() => new Date(), []);
  const isParent = !currentMember || currentMember.role !== "viewer";
  const me = currentMember ?? parents[0] ?? null;
  const partners = useMemo(() => parents.filter((parent) => parent.id !== (me?.id ?? currentMemberId)), [parents, me, currentMemberId]);
  const myCheckin = me ? checkinFor(checkins, me.id, today) : null;
  const streak = me ? checkinStreak(checkins, me.id, today) : 0;

  const days = useMemo(() => trendDays(14, today), [today]);
  const trend = useMemo(() => buildTrend(checkins, parents, days), [checkins, parents, days]);
  const hasTrendData = trend.some((series) => series.average !== null);
  const parentIds = useMemo(() => parents.map((parent) => parent.id), [parents]);
  const gratitude = useMemo(() => recentGratitude(checkins, parentIds), [checkins, parentIds]);
  const needs = useMemo(() => openNeeds(checkins, parentIds, today), [checkins, parentIds, today]);
  const aboveStreak = useMemo(() => bothAboveStreak(checkins, parents, today), [checkins, parents, today]);
  const connection = useMemo(() => recentConnectionScore(relationshipRecords, today), [relationshipRecords, today]);

  if (!isParent || !me) {
    return (
      <div className="app-page">
        <PageHeader title="Daily Check-in" description="A thirty-second pulse for each parent." />
        <EmptyState title="This one is for the grown-ups" description="Check-ins are a private space for parents to say how the day is really going." />
      </div>
    );
  }

  return (
    <div className="app-page">
      <PageHeader title="Daily Check-in" description="Mood, energy, one gratitude, one need. Your partner sees it and can meet you there." />

      <CheckinForm key={myCheckin?.id ?? "new"} member={me} existing={myCheckin} streak={streak} hasPartner={partners.length > 0} />

      {partners.length > 0 ? (
        <section className="app-section">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">{partners.length === 1 ? `How ${firstName(partners[0].display_name)} is doing` : "How your partners are doing"}</h2>
          </div>
          <div className="grid-auto-fit">
            {partners.map((partner) => {
              const latest = latestSharedCheckin(checkins, partner.id);
              const todayCheckin = checkinFor(checkins, partner.id, today);
              return <PartnerCard key={partner.id} partner={partner} checkin={todayCheckin?.shared_with_partner ? todayCheckin : latest} checkedInToday={Boolean(todayCheckin?.shared_with_partner)} />;
            })}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="fade-up fade-up-delay-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <CardTitle>Last 14 days</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {trend.map(({ member }) => (
                  <span key={member.id} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: paletteForMember(member, members).solid }} />
                    {firstName(member.display_name)}
                  </span>
                ))}
              </div>
            </div>
            <CardDescription>Mood, one dot per check-in. Patterns matter more than any single day.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {hasTrendData ? (
              <MoodTrendChart days={days} series={trend} />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl bg-muted/50 px-6 text-center text-sm text-muted-foreground">Two weeks of check-ins will draw a picture here.</div>
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              {trend.map(({ member, average }) => {
                const palette = paletteForMember(member, members);
                return (
                  <div key={member.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: palette.soft, color: palette.ink }}>
                    <MemberAvatar member={member} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium opacity-80">{firstName(member.display_name)} avg</p>
                      <p className="text-lg font-bold leading-tight">
                        {average !== null ? (
                          <>
                            {average.toFixed(1)} <span aria-hidden>{moodFace(average)}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 rounded-2xl bg-[#ACE1AF]/35 p-3 text-[#235226] dark:bg-[#ACE1AF]/15 dark:text-[#D7F2D9]">
                <span className="text-2xl" aria-hidden>
                  🌱
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium opacity-80">Both above 3</p>
                  <p className="text-lg font-bold leading-tight">
                    {aboveStreak} day{aboveStreak === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fade-up fade-up-delay-3 bg-gradient-to-br from-rose-50/80 to-transparent dark:from-rose-950/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle>Connection this month</CardTitle>
            </div>
            <CardDescription>Average connection score from the last 30 days of relationship practices.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold leading-none">{connection.average !== null ? connection.average.toFixed(1) : "—"}</span>
              <span className="pb-1 text-sm text-muted-foreground">/ 10 · {connection.count} {connection.count === 1 ? "entry" : "entries"}</span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {connection.average === null
                ? "Log a stress-reducing conversation or a state of the union and the score shows up here."
                : connection.average >= 7
                  ? "Solid. Keep catching each other's bids."
                  : "Worth a soft-startup conversation this week."}
            </p>
            <Button variant="outline" asChild className="justify-between">
              <Link href="/relationship">
                Open relationship hub
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid-auto-fit">
        <Card className="fade-up fade-up-delay-3">
          <CardHeader className="pb-2">
            <CardTitle>Recent gratitude</CardTitle>
            <CardDescription>The 5:1 ratio starts with noticing.</CardDescription>
          </CardHeader>
          <CardContent>
            {gratitude.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet. Your first check-in will land here.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {gratitude.map((checkin) => (
                  <li key={checkin.id} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                    <MemberAvatar memberId={checkin.member_id} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-wrap-safe text-sm leading-snug">{checkin.gratitude}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{format(parseISO(checkin.checkin_date), "EEE, MMM d")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="fade-up fade-up-delay-4">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <CardTitle>Open needs</CardTitle>
            </div>
            <CardDescription>Named in the last 7 days. Ask: empathy, help, or a witness?</CardDescription>
          </CardHeader>
          <CardContent>
            {needs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open needs this week. Nice.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {needs.map((checkin) => (
                  <li key={checkin.id} className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                    <MemberAvatar memberId={checkin.member_id} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-wrap-safe text-sm leading-snug">{checkin.needs}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{format(parseISO(checkin.checkin_date), "EEE, MMM d")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
