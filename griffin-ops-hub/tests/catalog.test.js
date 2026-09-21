import { describe, expect, it } from "vitest";
import templates from "../src/data/operationsTemplates.json";
import {
  GENERAL_PHASE,
  NEXT_TEMPLATE,
  PHASES,
  ROLE_STARTERS,
  TEMPLATE_UI,
  templatePhase,
  templatesByPhase,
  whenToUse,
} from "../src/lib/catalog.js";

describe("catalog phases", () => {
  it("has no lead or intake phase", () => {
    const ids = PHASES.map((phase) => phase.id);
    expect(ids).not.toContain("lead");
    expect(ids[0]).toBe("application");
    for (const phase of PHASES) {
      expect(`${phase.title} ${phase.job}`.toLowerCase()).not.toMatch(/lead|intake/);
    }
  });
  it("maps every published template to a known phase", () => {
    const known = new Set([...PHASES.map((p) => p.id), GENERAL_PHASE.id]);
    for (const template of templates) {
      expect(TEMPLATE_UI[template.id], template.id).toBeDefined();
      expect(known.has(templatePhase(template.id)), template.id).toBe(true);
    }
  });
  it("groups custom work last and never in a loan phase", () => {
    const grouped = templatesByPhase(templates);
    expect(grouped.at(-1).id).toBe("general");
    expect(grouped.at(-1).templates.map((t) => t.id)).toEqual(["CUSTOM_TASK"]);
  });
  it("points next-template suggestions at published templates", () => {
    const ids = new Set(templates.map((t) => t.id));
    for (const [from, to] of Object.entries(NEXT_TEMPLATE)) {
      expect(ids.has(from), from).toBe(true);
      expect(ids.has(to), to).toBe(true);
    }
    for (const starters of Object.values(ROLE_STARTERS))
      for (const id of starters) expect(ids.has(id), id).toBe(true);
  });
  it("describes when to use a template without acting as a hook", () => {
    expect(whenToUse({ id: "LOA_PREP" })).toMatch(/QC attestations/);
    expect(whenToUse({ id: "UNKNOWN", description: "First sentence. Second." })).toBe("First sentence");
    expect(whenToUse(undefined)).toBe("");
  });
});
