import { describe, expect, it } from "vitest";
import { detectPwaPlatform, getInstallGuidance } from "@/lib/pwa";

describe("PWA install guidance", () => {
  it("detects iOS devices including iPad desktop user agent mode", () => {
    expect(detectPwaPlatform({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" })).toBe("ios");
    expect(detectPwaPlatform({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", platform: "MacIntel", maxTouchPoints: 5 })).toBe("ios");
  });

  it("returns native prompt guidance when Android exposes beforeinstallprompt", () => {
    const guidance = getInstallGuidance({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel)",
      hasNativePrompt: true
    });

    expect(guidance.platform).toBe("android");
    expect(guidance.canPrompt).toBe(true);
    expect(guidance.steps[0]).toBe("Tap Install.");
  });

  it("does not show install steps when already running standalone", () => {
    const guidance = getInstallGuidance({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      standaloneDisplay: true
    });

    expect(guidance.installed).toBe(true);
    expect(guidance.steps).toHaveLength(0);
  });
});
