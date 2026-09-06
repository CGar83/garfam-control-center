"use client";

import { QuickGroceryBar } from "@/components/grocery/quick-grocery-bar";
import { ModulePage } from "@/components/pages/module-page";
import { moduleConfigs } from "@/lib/modules";

export default function GroceryPage() {
  return (
    <div className="app-page">
      <QuickGroceryBar />
      <ModulePage config={moduleConfigs.grocery} />
    </div>
  );
}
