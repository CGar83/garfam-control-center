"use client";

import { format } from "date-fns";
import { History } from "lucide-react";
import { MemberAvatarStack } from "@/components/app/member-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { JournalEntry } from "@/lib/types";
import { parseMaybeDate } from "@/lib/utils";

export function OnThisDayCard({ entries, today }: { entries: JournalEntry[]; today: Date }) {
  const thisYear = today.getFullYear();
  return (
    <Card className="fade-up fade-up-delay-2 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <History className="h-4 w-4" />
          </span>
          <div>
            <CardTitle>On this day</CardTitle>
            <CardDescription>{format(today, "MMMM d")} in years past</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            No memories from past {format(today, "MMMM d")}s yet. Add one today and next year this spot will surprise you.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.slice(0, 3).map((entry) => {
              const year = parseMaybeDate(entry.entry_date)?.getFullYear() ?? thisYear;
              const yearsAgo = thisYear - year;
              return (
                <li key={entry.id} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                  <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-foreground shadow-sm">
                    {yearsAgo === 1 ? "1 year ago" : `${yearsAgo} years ago`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-wrap-safe text-sm font-medium leading-snug">{entry.title}</p>
                    {entry.body ? <p className="text-wrap-safe mt-0.5 line-clamp-2 text-xs text-muted-foreground">{entry.body}</p> : null}
                  </div>
                  {(entry.people ?? []).length > 0 ? <MemberAvatarStack memberIds={entry.people ?? []} size="xs" max={3} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
