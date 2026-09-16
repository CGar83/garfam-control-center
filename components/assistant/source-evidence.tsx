"use client";
import {
  sourceCatalog,
  sourceHref,
  type AssistantSource,
  type AssistantCoverage,
} from "@/lib/assistant/context";

export function SourceEvidence({
  sources,
  coverage,
  fetchedAt,
  content,
}: {
  sources: AssistantSource[];
  coverage: AssistantCoverage[];
  fetchedAt?: string;
  content: string;
}) {
  const cited = new Set([...content.matchAll(/\[(S\d+)\]/g)].map((m) => m[1]));
  const incomplete = coverage.some((c) => c.clipped);
  return (
    <details className="mt-3 rounded-lg border p-3 text-xs">
      <summary className="cursor-pointer font-medium">
        Records supplied: {sources.length}
        {incomplete ? " · Partial coverage" : ""}
      </summary>
      <p className="mt-3 text-muted-foreground">
        {fetchedAt ? `Snapshot: ${new Date(fetchedAt).toLocaleString()}. ` : ""}
        References identify records supplied to the model, not independently
        verified facts.
      </p>
      <ul className="my-3 grid gap-2">
        {coverage.map((c) => (
          <li key={c.table}>
            {sourceCatalog[c.table].label}: {c.included} of {c.available}{" "}
            matching records{c.clipped ? " (incomplete)" : ""}
            {c.date_filtered ? " · date filtered" : ""}
          </li>
        ))}
      </ul>
      <ul className="max-h-60 space-y-2 overflow-y-auto border-t pt-3">
        {sources.map((s) => (
          <li key={s.ref} className="break-words">
            <a href={sourceHref(s)} className="underline underline-offset-2">
              [{s.ref}] {s.title || sourceCatalog[s.table].label}
            </a>
            {cited.has(s.ref) ? " · Cited" : ""}
            <span className="ml-2 text-muted-foreground">
              {sourceCatalog[s.table].label}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
