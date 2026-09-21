import { describe, expect, it } from "vitest";
import journey from "../src/data/loanJourney.json";
import templates from "../src/data/operationsTemplates.json";
import { PHASES } from "../src/lib/catalog.js";

describe("loan journey data", () => {
  it("omits the lead and discovery phase", () => {
    expect(journey.phases.map((phase) => phase.id)).not.toContain("lead");
    expect(journey.phases[0].id).toBe("application");
    expect(journey.version).toBe(3);
  });
  it("keeps every remaining step tied to a published template or an explicit outside-Hub observation", () => {
    const ids = new Set(templates.map((template) => template.id));
    for (const phase of journey.phases)
      for (const step of phase.steps) {
        if (step.templateId) expect(ids.has(step.templateId), step.id).toBe(true);
        else expect(step.system, step.id).toBeTruthy();
      }
  });
  it("uses phase ids the catalog can label", () => {
    const known = new Set([...PHASES.map((p) => p.id), "conditions"]);
    for (const phase of journey.phases) expect(known.has(phase.id), phase.id).toBe(true);
  });
});
