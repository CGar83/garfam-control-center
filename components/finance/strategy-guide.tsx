import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const steps = [
  {
    title: "Verify the starting point",
    timing: "Before allocating money",
    text: "Reconcile imported balances, limits, APRs, minimum payments, and due dates against current statements. Keep conflicting snapshots separate until verified. Record the date and scoring model with any credit score.",
  },
  {
    title: "Protect essentials and required payments",
    timing: "This week",
    text: "Assign take-home income to housing, essential expenses, and required debt payments first. Verify payment reminders and autopay with each provider. If the plan has a shortfall, resolve it before assigning extra paydown.",
  },
  {
    title: "Turn recurring-cost decisions into results",
    timing: "This month",
    text: "Review each service, choose keep, pause, or cancel, and complete changes with the provider. Save confirmation and check the next statement. Planned cuts are not savings already achieved. Annual charges remain annual obligations even when shown as a monthly equivalent.",
  },
  {
    title: "Choose a reserve and paydown plan",
    timing: "Next 90 days",
    text: "Set a reserve target that fits your household, then assign the remaining surplus. Compare higher-interest balances with smaller balances that could be cleared sooner. Keep every required payment covered. Recalculate after interest, new charges, or a paid-off installment changes the plan.",
  },
  {
    title: "Review progress without chasing a score promise",
    timing: "Monthly",
    text: "Refresh balances and check credit reports for errors. Treat 90%, 70%, 50%, and 30% as progress markers, not guaranteed scoring thresholds. Avoid opening or closing accounts solely to chase a predicted score. Do not dispute accurate information or spend reserve money based on an unverified projection.",
  },
];

export function StrategyGuide() {
  return (
    <section className="border-y py-6">
      <h2 className="text-lg font-semibold">Your recovery playbook</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A repeatable review, grounded in current statements.
      </p>
      <div className="mt-4 divide-y">
        {steps.map((step, index) => (
          <details key={step.title} className="group py-4">
            <summary className="cursor-pointer text-sm font-medium focus-ring">
              <span className="ml-2 mr-3 text-xs text-muted-foreground">
                0{index + 1}
              </span>
              {step.title}
            </summary>
            <div className="mt-3 max-w-3xl space-y-2 pl-8 text-sm leading-relaxed text-muted-foreground">
              <p className="text-xs font-medium text-primary">{step.timing}</p>
              <p>{step.text}</p>
            </div>
          </details>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        <Link
          href="https://www.consumerfinance.gov/ask-cfpb/how-do-i-get-and-keep-a-good-credit-score-en-318/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary underline"
        >
          CFPB credit guidance <ArrowUpRight className="h-3 w-3" />
        </Link>
        <Link
          href="https://www.consumerfinance.gov/consumer-tools/debt-collection/answers/key-terms/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary underline"
        >
          Credit counseling and debt terms <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Planning support, not individualized financial, legal, or tax advice. A
        qualified counselor can help when payments are unaffordable.
      </p>
    </section>
  );
}
