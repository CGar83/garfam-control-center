"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickAddSheet } from "@/components/app/quick-add-sheet";

/** Header quick-add button. Also opens with the "n" shortcut when nothing is focused. */
export function QuickAddMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (!typing && !event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="hidden lg:inline-flex">
        <Plus className="h-4 w-4" />
        Quick add
        <span className="ml-1 hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold xl:inline">N</span>
      </Button>
      <QuickAddSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
