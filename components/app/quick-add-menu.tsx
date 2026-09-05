"use client";

import { useState } from "react";
import {
  CalendarPlus,
  ClipboardPlus,
  FilePlus2,
  HeartHandshake,
  MessageSquarePlus,
  PartyPopper,
  Plus,
  ReceiptText,
  ShoppingCart,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { moduleConfigs, type ModuleKey } from "@/lib/modules";

const quickItems: Array<{ label: string; module: ModuleKey; icon: typeof Plus; defaults?: Record<string, unknown> }> = [
  { label: "Add event", module: "calendar", icon: CalendarPlus },
  { label: "Add task", module: "tasks", icon: ClipboardPlus },
  { label: "Add activity idea", module: "activities", icon: PartyPopper },
  { label: "Add grocery item", module: "grocery", icon: ShoppingCart },
  { label: "Add bill", module: "bills", icon: ReceiptText },
  { label: "Add transaction", module: "transactions", icon: WalletCards },
  { label: "Add appointment", module: "health", icon: CalendarPlus, defaults: { record_type: "Appointment" } },
  { label: "Add note", module: "communication", icon: MessageSquarePlus },
  { label: "Add relationship check-in", module: "relationship", icon: HeartHandshake },
  { label: "Add document", module: "documents", icon: FilePlus2 }
];

export function QuickAddMenu() {
  const [selected, setSelected] = useState<(typeof quickItems)[number] | null>(null);
  const config = selected ? moduleConfigs[selected.module] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {quickItems.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem key={item.label} onSelect={() => setSelected(item)}>
                <Icon className="h-4 w-4" />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {config ? (
        <RecordFormDialog
          config={config}
          open={Boolean(selected)}
          defaultOverrides={selected?.defaults}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      ) : null}
    </>
  );
}
