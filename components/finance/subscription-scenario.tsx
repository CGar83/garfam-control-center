"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { money, subscriptionScenario } from "@/lib/finance/calculations";

export function SubscriptionScenario({ current }: { current: number }) {
  const [target, setTarget] = useState("");
  const result = subscriptionScenario(current, target);
  return (
    <section className="grid gap-5 border-y py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <h3 className="font-semibold">What would you keep?</h3>
        <label className="mt-3 block max-w-xs text-sm">
          Monthly spend target
          <Input
            className="mt-2"
            type="number"
            inputMode="decimal"
            min="0"
            max="10000000000"
            step="0.01"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0.00"
          />
        </label>
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-xs text-muted-foreground">
          Monthly difference from current services
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {result ? money(result.monthly) : "Enter a target"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {result
            ? `${money(Math.abs(result.annual))} annualized${result.monthly < 0 ? " increase in spend" : " potential reduction"}`
            : "Scenario only. Your saved plan stays unchanged."}
        </p>
      </div>
    </section>
  );
}
