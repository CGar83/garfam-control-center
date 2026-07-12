import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
  tone?: "default" | "red" | "yellow" | "green" | "sage";
}

const toneClasses = {
  default: "bg-muted text-muted-foreground",
  red: "bg-red-50/80 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  yellow: "bg-amber-50/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  green: "bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  sage: "bg-[#ACE1AF]/35 text-[#235226] dark:bg-[#ACE1AF]/15 dark:text-[#D7F2D9]"
};

export function StatCard({ label, value, helper, icon, tone = "default" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        {icon ? <div className={cn("flex h-10 w-10 items-center justify-center rounded-md", toneClasses[tone])}>{icon}</div> : null}
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-normal text-foreground">{value}</p>
          {helper ? <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
