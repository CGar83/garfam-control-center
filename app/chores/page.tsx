"use client";

import { useMemo, useState } from "react";
import { isSameDay, startOfDay } from "date-fns";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { useAppData } from "@/components/app/providers";
import { KidHeroCard } from "@/components/chores/hero-strip";
import { Leaderboard } from "@/components/chores/leaderboard";
import { ManageTab } from "@/components/chores/manage-tab";
import { RewardsTab } from "@/components/chores/rewards-tab";
import { TodayTab } from "@/components/chores/today-tab";
import { WeekChart } from "@/components/chores/week-chart";
import { encouragementFor, isSameOrBeforeToday, memberFirstName, type StarterChore } from "@/components/chores/helpers";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useToast } from "@/hooks/use-toast";
import { isChildMember } from "@/lib/family-members";
import { moduleConfigs } from "@/lib/modules";
import { choreCompletedOn, choreProgressForDay, dateKey, pointsBalance } from "@/lib/streaks";
import type { Chore, FamilyMember, Reward, RewardClaim } from "@/lib/types";

export default function ChoresPage() {
  const { data, createRecord, updateRecord, deleteRecord, currentMember, currentMemberId } = useAppData();
  const { members } = useFamilyMembers();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfDay(new Date()));

  const today = useMemo(() => startOfDay(new Date()), []);
  const isParent = !currentMember || currentMember.role !== "viewer";
  const isKid = Boolean(currentMember && currentMember.role === "viewer");

  const chores = data.chores;
  const completions = data.chore_completions;
  const claims = data.reward_claims;
  const rewards = data.rewards;

  const kids = useMemo(() => {
    const list = members.filter(isChildMember);
    if (isKid && currentMemberId) {
      const mine = list.find((member) => member.id === currentMemberId);
      if (mine) return [mine, ...list.filter((member) => member.id !== currentMemberId)];
    }
    return list;
  }, [currentMemberId, isKid, members]);

  /** Kids first (current kid at the very front), then everyone else. */
  const orderedMembers = useMemo(() => {
    const others = members.filter((member) => !kids.some((kid) => kid.id === member.id));
    return [...kids, ...others];
  }, [kids, members]);

  function canToggleChore(chore: Chore, date: Date) {
    if (isParent) return true;
    if (!isSameOrBeforeToday(date, today)) return false;
    return !chore.assigned_to || chore.assigned_to === currentMemberId;
  }

  async function toggleChore(chore: Chore, date: Date) {
    if (!canToggleChore(chore, date)) return;
    const existing = choreCompletedOn(completions, chore.id, date);
    if (existing) {
      await deleteRecord("chore_completions", existing.id);
      return;
    }
    const memberId = chore.assigned_to ?? currentMemberId;
    await createRecord("chore_completions", {
      chore_id: chore.id,
      member_id: memberId,
      completed_on: dateKey(date),
      points_awarded: chore.points,
      approved_by: isParent ? currentMemberId : null
    });
    if (isSameDay(date, today)) {
      const doneCount = choreProgressForDay(chores, completions, memberId ?? null, today).done.length + 1;
      toast({
        title: chore.points > 0 ? `+${chore.points} points` : "Checked off",
        description: encouragementFor(doneCount),
        variant: "success"
      });
    }
  }

  function balanceFor(memberId: string) {
    return pointsBalance(completions, claims, memberId);
  }

  async function redeem(reward: Reward, memberId: string) {
    if (!isParent && memberId !== currentMemberId) return;
    if (balanceFor(memberId) < reward.cost_points) return;
    await createRecord("reward_claims", {
      reward_id: reward.id,
      member_id: memberId,
      points_spent: reward.cost_points,
      claimed_on: dateKey(today),
      fulfilled: false
    });
    const kid = members.find((member) => member.id === memberId);
    toast({
      title: `${reward.emoji ?? "🎁"} ${reward.title} redeemed`,
      description: isParent ? `${memberFirstName(kid)} spent ${reward.cost_points} points. Time to make good on it.` : `You spent ${reward.cost_points} points. A parent will make it happen.`,
      variant: "success"
    });
  }

  async function fulfill(claim: RewardClaim) {
    if (!isParent) return;
    await updateRecord("reward_claims", claim.id, { fulfilled: true });
    toast({ title: "Reward delivered", variant: "success" });
  }

  async function addStarter(kid: FamilyMember, starter: StarterChore) {
    if (!isParent) return;
    await createRecord("chores", {
      title: starter.title,
      emoji: starter.emoji,
      assigned_to: kid.id,
      points: starter.points,
      frequency: starter.frequency,
      days_of_week: starter.frequency === "weekly" ? [0] : [],
      time_of_day: starter.time_of_day,
      active: true,
      notes: null,
      created_by: currentMemberId
    });
    toast({ title: `${starter.emoji} ${starter.title} added`, description: `Now on ${memberFirstName(kid)}'s list.`, variant: "success" });
  }

  const addChoreButton = isParent ? (
    <Button onClick={() => setFormOpen(true)}>
      <Plus className="h-4 w-4" />
      Add chore
    </Button>
  ) : undefined;

  const description = isKid
    ? "Check off what's yours today, watch your points grow, and spend them in the reward store."
    : "Who's doing what today, the weekly chart, and the reward store where points get cashed in.";

  return (
    <div className="app-page">
      <PageHeader title="Chores & Rewards" description={description} action={addChoreButton} />

      {kids.length > 0 ? (
        <div className="fade-up grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kids.map((kid, index) => (
            <KidHeroCard key={kid.id} member={kid} members={members} chores={chores} completions={completions} claims={claims} today={today} featured={isKid && index === 0} />
          ))}
        </div>
      ) : chores.length === 0 && isParent ? (
        <EmptyState
          title="Let's set up chores"
          description="Add your kids in Settings, then create a few chores. Each kid gets their own card with progress, points, and streaks right here."
          action={addChoreButton}
        />
      ) : null}

      <div className="fade-up fade-up-delay-1 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Tabs defaultValue="today" className="min-w-0">
          <TabsList aria-label="Chores views">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week chart</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            {isParent ? <TabsTrigger value="manage">Manage</TabsTrigger> : null}
          </TabsList>
          <TabsContent value="today">
            <TodayTab
              members={members}
              orderedMembers={orderedMembers}
              chores={chores}
              completions={completions}
              today={today}
              canToggle={(chore) => canToggleChore(chore, today)}
              onToggle={(chore) => void toggleChore(chore, today)}
              emptyAction={addChoreButton}
            />
          </TabsContent>
          <TabsContent value="week">
            <WeekChart
              members={members}
              orderedMembers={orderedMembers}
              chores={chores}
              completions={completions}
              anchor={weekAnchor}
              today={today}
              onAnchorChange={setWeekAnchor}
              canToggle={canToggleChore}
              onToggle={(chore, date) => void toggleChore(chore, date)}
              emptyAction={addChoreButton}
            />
          </TabsContent>
          <TabsContent value="rewards">
            <RewardsTab
              members={members}
              kids={kids}
              rewards={rewards}
              claims={claims}
              isParent={isParent}
              currentMember={currentMember}
              balanceFor={balanceFor}
              onRedeem={(reward, memberId) => void redeem(reward, memberId)}
              onFulfill={(claim) => void fulfill(claim)}
              onDelete={async (reward) => {
                await deleteRecord("rewards", reward.id);
                toast({ title: "Reward deleted", variant: "success" });
              }}
            />
          </TabsContent>
          {isParent ? (
            <TabsContent value="manage">
              <ManageTab
                members={members}
                kids={kids}
                chores={chores}
                onToggleActive={(chore) => void updateRecord("chores", chore.id, { active: !chore.active })}
                onDelete={async (chore) => {
                  await deleteRecord("chores", chore.id);
                  toast({ title: "Chore deleted", variant: "success" });
                }}
                onAddStarter={addStarter}
              />
            </TabsContent>
          ) : null}
        </Tabs>

        <aside className="fade-up fade-up-delay-2 min-w-0 lg:pt-14">
          <Leaderboard members={members} kids={kids} completions={completions} today={today} />
        </aside>
      </div>

      {isParent ? <RecordFormDialog config={moduleConfigs.chores} open={formOpen} onOpenChange={setFormOpen} /> : null}
    </div>
  );
}
