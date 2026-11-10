"use client";

import { useRef } from "react";
import { useAppData } from "@/components/app/providers";
import { useToast } from "./use-toast";
import type { GroceryItem } from "@/lib/types";

export function useGroceryCheck() {
  const app = useAppData();
  const latest = useRef(app);
  latest.current = app;
  const inFlight = useRef(new Set<string>());
  const { toast } = useToast();
  return async (item: GroceryItem, checked: boolean) => {
    if (inFlight.current.has(item.id)) return;
    inFlight.current.add(item.id);
    const family = app.familyId;
    const member = app.currentMemberId;
    try {
      await app.updateRecord("grocery_items", item.id, { checked });
      if (checked)
        toast({
          title: `${item.name} checked`,
          variant: "success",
          action: {
            label: "Undo",
          familyId: family,
          memberId: member,
            onClick: async () => {
              if (
                latest.current.familyId !== family ||
                latest.current.currentMemberId !== member
              ) {
                toast({
                  title: "Return to the original profile to undo",
                  variant: "destructive",
                });
                return;
              }
              if (
                !latest.current.data.grocery_items.some(
                  (row) => row.id === item.id,
                )
              ) {
                toast({
                  title: "This item has been removed",
                  variant: "destructive",
                });
                return;
              }
              try {
                await latest.current.updateRecord("grocery_items", item.id, {
                  checked: false,
                });
              } catch {
                toast({
                  title: "Could not undo. Try unchecking the item again.",
                  variant: "destructive",
                });
              }
            },
          },
        });
    } catch {
      toast({
        title: "Could not update grocery item",
        description: "Try again when your connection is available.",
        variant: "destructive",
      });
    } finally {
      inFlight.current.delete(item.id);
    }
  };
}
