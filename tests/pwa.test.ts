import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

const root = process.cwd();

describe("pwa configuration", () => {
  it("uses the production accent palette and installable icon set", () => {
    const data = manifest();
    const iconSources = new Set(data.icons?.map((icon) => icon.src));

    expect(data.theme_color).toBe("#CC5500");
    expect(data.background_color).toBe("#f5f5f7");
    expect(data.display).toBe("standalone");
    expect(iconSources.has("/icons/icon-192.png")).toBe(true);
    expect(iconSources.has("/icons/icon-512.png")).toBe(true);
    expect(iconSources.has("/icons/maskable-512.png")).toBe(true);
  });

  it("has generated png icons available in public assets", () => {
    for (const icon of ["apple-touch-icon.png", "icon-192.png", "icon-512.png", "maskable-192.png", "maskable-512.png"]) {
      expect(existsSync(join(root, "public", "icons", icon))).toBe(true);
    }
  });
});
