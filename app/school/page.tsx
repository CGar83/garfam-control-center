"use client";

import { ModulePage } from "@/components/pages/module-page";
import { moduleConfigs } from "@/lib/modules";

export default function SchoolPage() {
  return <ModulePage config={moduleConfigs.school} />;
}
