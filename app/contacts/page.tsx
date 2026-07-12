"use client";

import { ModulePage } from "@/components/pages/module-page";
import { moduleConfigs } from "@/lib/modules";

export default function ContactsPage() {
  return <ModulePage config={moduleConfigs.contacts} />;
}
