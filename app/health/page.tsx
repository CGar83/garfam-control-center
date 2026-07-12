"use client";

import { ModulePage } from "@/components/pages/module-page";
import { moduleConfigs } from "@/lib/modules";

export default function HealthPage() {
  return <ModulePage config={moduleConfigs.health} />;
}
