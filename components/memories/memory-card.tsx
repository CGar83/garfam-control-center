"use client";

import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { MemberAvatar, MemberAvatarStack } from "@/components/app/member-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { paletteForMember } from "@/lib/member-colors";
import type { JournalEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { entryDayParts } from "@/components/memories/helpers";
import { moodEmojiFor } from "@/components/memories/quick-capture";

interface MemoryCardProps {
  entry: JournalEntry;
  canManage: boolean;
  onToggleHighlight: (entry: JournalEntry) => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
  showYear?: boolean;
}

export function MemoryCard({ entry, canManage, onToggleHighlight, onEdit, onDelete, showYear }: MemoryCardProps) {
  const { members, findMember } = useFamilyMembers();
  const author = findMember(entry.author_id);
  const palette = paletteForMember(author, members);
  const { day, weekday, full } = entryDayParts(entry);
  const people = (entry.people ?? []).filter((id) => members.some((member) => member.id === id));

  return (
    <article className="record-tile flex gap-3 border-l-4 p-3 sm:gap-4 sm:p-4" style={{ borderLeftColor: palette.solid }}>
      <div className="flex w-12 shrink-0 flex-col items-center justify-start rounded-xl py-1.5 text-center" style={{ backgroundColor: palette.soft, color: palette.ink }} title={full}>
        <span className="text-[10px] font-semibold uppercase leading-none">{weekday}</span>
        <span className="mt-1 text-xl font-bold leading-none">{day}</span>
        {showYear ? <span className="mt-1 text-[10px] font-medium leading-none opacity-80">{full.slice(-4)}</span> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-wrap-safe text-sm font-semibold leading-snug sm:text-base">{entry.title}</h3>
          <div className="-mr-1 -mt-1 flex shrink-0 items-center">
            <button
              type="button"
              aria-pressed={entry.highlight}
              aria-label={entry.highlight ? "Remove from highlights" : "Mark as highlight"}
              disabled={!canManage}
              onClick={() => onToggleHighlight(entry)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90 focus-ring disabled:cursor-default",
                entry.highlight ? "text-amber-500" : "text-muted-foreground/60 hover:text-amber-500 disabled:hover:text-muted-foreground/60"
              )}
            >
              <Star className={cn("h-5 w-5", entry.highlight && "fill-current pop-in")} />
            </button>
            {canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label={`Options for ${entry.title}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onEdit(entry)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(entry)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        {entry.body ? <p className="text-wrap-safe mt-1 text-sm leading-6 text-muted-foreground">{entry.body}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {author ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MemberAvatar member={author} size="xs" />
              {author.display_name.split(" ")[0]}
            </span>
          ) : null}
          {people.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="hidden sm:inline">with</span>
              <MemberAvatarStack memberIds={people} size="xs" />
            </span>
          ) : null}
          {entry.mood ? (
            <Badge variant="outline" className="gap-1">
              <span aria-hidden>{moodEmojiFor(entry.mood)}</span>
              {entry.mood}
            </Badge>
          ) : null}
          {(entry.tags ?? []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="font-normal">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>
    </article>
  );
}
