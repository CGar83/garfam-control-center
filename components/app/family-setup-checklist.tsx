"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { useAppData } from "./providers";
import { Button } from "@/components/ui/button";

function Checklist() {
  const { data, familyId, currentUser, currentMember, loading } = useAppData();
  const router = useRouter();
  const params = useSearchParams();
  const forced = params.get("setup") === "1";
  const key = `gather:setup:v1:${familyId}:${currentUser.id}`;
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const steps = [
    {
      label: "Add your household members",
      done:
        data.family_members.filter((member) => member.family_id === familyId)
          .length >= 2,
      href: "/settings#members",
    },
    {
      label: "Add your first calendar event",
      done: data.events.some((event) => event.family_id === familyId),
      href: "/calendar",
    },
    {
      label: "Start your shared grocery list",
      done: data.grocery_items.some((item) => item.family_id === familyId),
      href: "/grocery",
    },
  ];
  const complete = steps.every((step) => step.done);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(key) === "done");
    } catch {
      setDismissed(false);
    }
  }, [key]);
  useEffect(() => {
    if (!loading && complete) {
      try {
        localStorage.setItem(key, "done");
      } catch {
        /* Setup remains usable without browser storage. */
      }
    }
  }, [complete, key, loading]);
  if (
    loading ||
    dismissed === null ||
    (!forced && (dismissed || complete)) ||
    !currentMember ||
    !["admin", "parent"].includes(currentMember.role)
  )
    return null;
  return (
    <section className="border-y py-5" aria-label="Family setup">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Make this your family’s home base
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {steps.filter((step) => step.done).length} of 3 ready
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss family setup"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(key, "done");
            } catch {
              /* Dismiss for this visit. */
            }
            const next = new URLSearchParams(params.toString());
            next.delete("setup");
            router.replace(`/today${next.size ? `?${next}` : ""}`, {
              scroll: false,
            });
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <li key={step.href}>
            <Link
              className="flex min-h-12 items-center gap-3 rounded-lg border px-3 py-3 text-sm hover:bg-muted focus-ring"
              href={step.href}
            >
              {step.done ? (
                <Check
                  className="h-4 w-4 shrink-0 text-emerald-600"
                  aria-label="Complete"
                />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border" />
              )}
              {step.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FamilySetupChecklist() {
  return (
    <Suspense fallback={null}>
      <Checklist />
    </Suspense>
  );
}
