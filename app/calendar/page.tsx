"use client";

import { ModulePage } from "@/components/pages/module-page";
import { CalendarSyncPanel } from "@/components/app/calendar-sync-panel";
import { moduleConfigs } from "@/lib/modules";

export default function CalendarPage() {
  return (
    <div className="space-y-8">
      <ModulePage config={moduleConfigs.calendar} />
      <CalendarSyncPanel />
    </div>
  );
}
