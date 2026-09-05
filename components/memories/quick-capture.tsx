"use client";

import { useState, type KeyboardEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { MemberChip } from "@/components/app/member-avatar";
import { useAppData } from "@/components/app/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useToast } from "@/hooks/use-toast";
import { journalMoods } from "@/lib/options";
import { dateKey } from "@/lib/streaks";
import { cn } from "@/lib/utils";

const moodEmoji: Record<(typeof journalMoods)[number], string> = {
  Joyful: "😄",
  Grateful: "🙏",
  Calm: "🌿",
  Proud: "🏅",
  Silly: "🤪",
  Tired: "😴",
  "Tough day": "🌧️",
  "Big milestone": "🎉"
};

export function moodEmojiFor(mood?: string | null) {
  return mood && mood in moodEmoji ? moodEmoji[mood as keyof typeof moodEmoji] : "✨";
}

export function QuickCapture() {
  const { createRecord, currentMemberId } = useAppData();
  const { members } = useFamilyMembers();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [people, setPeople] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  function togglePerson(id: string) {
    setPeople((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await createRecord("journal_entries", {
        entry_date: dateKey(new Date()),
        title: title.trim(),
        body: null,
        author_id: currentMemberId,
        people,
        tags: [],
        mood,
        highlight: false
      });
      setTitle("");
      setMood(null);
      setPeople([]);
      toast({ title: "Memory saved", description: "Small moments add up.", variant: "success" });
    } catch (error) {
      toast({ title: "Could not save", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    }
  }

  return (
    <Card className="fade-up fade-up-delay-1 border-primary/20 bg-gradient-to-br from-primary/[0.07] to-transparent">
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">What happened today?</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Lily rode without training wheels"
            aria-label="What happened today"
            maxLength={160}
            className="h-12 text-base"
          />
          <Button onClick={() => void save()} disabled={!canSave} className="h-12 sm:w-28" aria-label="Save memory">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 no-scrollbar" role="group" aria-label="Feeling">
          {journalMoods.map((option) => {
            const active = mood === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setMood(active ? null : option)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all active:scale-[0.97] focus-ring",
                  active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-white/70 text-muted-foreground hover:border-primary/40 dark:bg-white/5"
                )}
              >
                <span aria-hidden>{moodEmoji[option]}</span>
                {option}
              </button>
            );
          })}
        </div>
        {members.length > 0 ? (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 no-scrollbar" role="group" aria-label="Who was there">
            {members.map((member) => (
              <MemberChip key={member.id} member={member} active={people.includes(member.id)} onClick={() => togglePerson(member.id)} size="sm" />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
