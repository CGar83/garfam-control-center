"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Gift, MoreHorizontal, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { MemberAvatar, MemberChip } from "@/components/app/member-avatar";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { moduleConfigs } from "@/lib/modules";
import { paletteForMember } from "@/lib/member-colors";
import type { FamilyMember, Reward, RewardClaim } from "@/lib/types";
import { cn } from "@/lib/utils";
import { memberFirstName } from "./helpers";

interface RewardsTabProps {
  members: FamilyMember[];
  kids: FamilyMember[];
  rewards: Reward[];
  claims: RewardClaim[];
  isParent: boolean;
  currentMember: FamilyMember | null;
  balanceFor: (memberId: string) => number;
  onRedeem: (reward: Reward, memberId: string) => void;
  onFulfill: (claim: RewardClaim) => void;
  onDelete: (reward: Reward) => Promise<void>;
}

export function RewardsTab({ members, kids, rewards, claims, isParent, currentMember, balanceFor, onRedeem, onFulfill, onDelete }: RewardsTabProps) {
  const [pickedKid, setPickedKid] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [deleting, setDeleting] = useState<Reward | null>(null);

  // Fall back to the first kid until a parent picks one, and recover if the picked kid disappears.
  const pickedKidId = pickedKid && kids.some((kid) => kid.id === pickedKid) ? pickedKid : (kids[0]?.id ?? null);
  const shopperId = isParent ? pickedKidId : (currentMember?.id ?? null);
  const myPending = !isParent && shopperId ? claims.filter((claim) => claim.member_id === shopperId && !claim.fulfilled) : [];
  const shopper = members.find((member) => member.id === shopperId) ?? null;
  const balance = shopperId ? balanceFor(shopperId) : 0;
  const shopperPalette = paletteForMember(shopper, members);

  const visibleRewards = rewards
    .filter((reward) => isParent || reward.available)
    .filter((reward) => isParent || !reward.for_member_id || reward.for_member_id === shopperId)
    .sort((a, b) => a.cost_points - b.cost_points);

  const pending = claims.filter((claim) => !claim.fulfilled).sort((a, b) => b.claimed_on.localeCompare(a.claimed_on));
  const history = claims
    .filter((claim) => claim.fulfilled)
    .sort((a, b) => b.claimed_on.localeCompare(a.claimed_on))
    .slice(0, 10);
  const rewardById = (id: string) => rewards.find((reward) => reward.id === id);

  const addButton = isParent ? (
    <Button onClick={() => setFormOpen(true)}>
      <Plus className="h-4 w-4" />
      Add reward
    </Button>
  ) : undefined;

  return (
    <div className="app-section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isParent ? (
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Redeem for</p>
            {kids.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {kids.map((kid) => (
                  <MemberChip key={kid.id} member={kid} active={pickedKidId === kid.id} onClick={() => setPickedKid(kid.id)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Add a kid in Settings to start redeeming rewards.</p>
            )}
          </div>
        ) : null}
        {shopper ? (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-2" style={{ backgroundColor: shopperPalette.soft, color: shopperPalette.ink }}>
            <MemberAvatar member={shopper} size="sm" />
            <div>
              <p className="text-xs font-medium opacity-80">{isParent ? `${memberFirstName(shopper)}'s balance` : "Your balance"}</p>
              <p className="flex items-center gap-1 text-xl font-bold leading-tight">
                <Star className="h-4 w-4" aria-hidden />
                {balance} pts
              </p>
            </div>
          </div>
        ) : null}
        {addButton}
      </div>

      {visibleRewards.length === 0 ? (
        <EmptyState title="No rewards yet" description="Add a reward like extra screen time or picking the Friday movie so points have somewhere to go." action={addButton} />
      ) : (
        <div className="grid-auto-fit-sm">
          {visibleRewards.map((reward) => {
            const forMember = reward.for_member_id ? members.find((member) => member.id === reward.for_member_id) : null;
            const forPalette = paletteForMember(forMember, members);
            const affordable = Boolean(shopperId) && balance >= reward.cost_points;
            const lockedToOther = Boolean(reward.for_member_id) && reward.for_member_id !== shopperId;
            return (
              <Card key={reward.id} className={cn("flex flex-col", !reward.available && "opacity-60")}>
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl" aria-hidden>
                      {reward.emoji ?? "🎁"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold leading-tight">{reward.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="warning">
                          <Star className="mr-1 h-3 w-3" aria-hidden />
                          {reward.cost_points} pts
                        </Badge>
                        {forMember ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: forPalette.soft, color: forPalette.ink }}>
                            <MemberAvatar member={forMember} size="xs" /> for {memberFirstName(forMember)}
                          </span>
                        ) : null}
                        {!reward.available ? <Badge variant="outline">Hidden</Badge> : null}
                      </div>
                    </div>
                    {isParent ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-9 w-9" aria-label={`More options for ${reward.title}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(reward)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(reward)}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                  {reward.description ? <p className="text-sm leading-6 text-muted-foreground">{reward.description}</p> : null}
                  <div className="mt-auto">
                    <Button
                      className="w-full"
                      size="lg"
                      variant={affordable ? "default" : "outline"}
                      disabled={!shopperId || !affordable || lockedToOther || !reward.available}
                      onClick={() => shopperId && onRedeem(reward, shopperId)}
                    >
                      <Gift className="h-4 w-4" />
                      {!shopperId
                        ? "Pick a kid"
                        : lockedToOther
                          ? `Just for ${forMember ? memberFirstName(forMember) : "someone else"}`
                          : affordable
                            ? isParent
                              ? `Redeem for ${memberFirstName(shopper)}`
                              : "Redeem"
                            : `${reward.cost_points - balance} more pts`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isParent && myPending.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Waiting on a parent</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {myPending.map((claim) => {
                const reward = rewardById(claim.reward_id);
                return (
                  <li key={claim.id} className="record-tile flex items-center gap-3">
                    <span className="text-xl" aria-hidden>
                      {reward?.emoji ?? "🎁"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{reward?.title ?? "Reward"}</p>
                      <p className="text-xs text-muted-foreground">Redeemed {format(parseISO(claim.claimed_on), "MMM d")} · {claim.points_spent} pts</p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {isParent ? (
        <div className="grid-auto-fit">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pending fulfillment</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing waiting. Every redeemed reward has been delivered.</p>
              ) : (
                <ul className="space-y-2">
                  {pending.map((claim) => {
                    const reward = rewardById(claim.reward_id);
                    const kid = members.find((member) => member.id === claim.member_id) ?? null;
                    return (
                      <li key={claim.id} className="record-tile flex items-center gap-3">
                        <span className="text-xl" aria-hidden>
                          {reward?.emoji ?? "🎁"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{reward?.title ?? "Reward"}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MemberAvatar member={kid} size="xs" /> {memberFirstName(kid)} · {format(parseISO(claim.claimed_on), "MMM d")} · {claim.points_spent} pts
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => onFulfill(claim)}>
                          Mark done
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Fulfilled rewards will show up here.</p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {history.map((claim) => {
                    const reward = rewardById(claim.reward_id);
                    const kid = members.find((member) => member.id === claim.member_id) ?? null;
                    return (
                      <li key={claim.id} className="flex items-center gap-3 py-2 text-sm">
                        <span aria-hidden>{reward?.emoji ?? "🎁"}</span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{memberFirstName(kid)}</span> <span className="text-muted-foreground">got</span> {reward?.title ?? "a reward"}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{format(parseISO(claim.claimed_on), "MMM d")}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isParent ? (
        <>
          <RecordFormDialog config={moduleConfigs.rewards} open={formOpen} onOpenChange={setFormOpen} />
          <RecordFormDialog config={moduleConfigs.rewards} record={editing} open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} />
          <ConfirmDialog
            open={Boolean(deleting)}
            onOpenChange={(open) => !open && setDeleting(null)}
            title="Delete this reward?"
            description="It disappears from the store. Past claims stay in the history."
            onConfirm={async () => {
              if (deleting) await onDelete(deleting);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
