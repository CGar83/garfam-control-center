export type PwaPlatform = "ios" | "android" | "desktop" | "unknown";

export interface InstallEnvironment {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standaloneDisplay?: boolean;
  iosStandalone?: boolean;
  hasNativePrompt?: boolean;
}

export interface InstallGuidance {
  platform: PwaPlatform;
  canPrompt: boolean;
  installed: boolean;
  title: string;
  description: string;
  steps: string[];
}

export function detectPwaPlatform(input: Pick<InstallEnvironment, "userAgent" | "platform" | "maxTouchPoints">): PwaPlatform {
  const userAgent = input.userAgent.toLowerCase();
  const platform = input.platform?.toLowerCase() ?? "";
  const touchPoints = input.maxTouchPoints ?? 0;
  const iPadDesktopMode = platform === "macintel" && touchPoints > 1;

  if (/iphone|ipad|ipod/.test(userAgent) || iPadDesktopMode) return "ios";
  if (/android/.test(userAgent)) return "android";
  if (/macintosh|windows|linux|cros/.test(userAgent) || platform) return "desktop";
  return "unknown";
}

export function getInstallGuidance(input: InstallEnvironment): InstallGuidance {
  const platform = detectPwaPlatform(input);
  const installed = Boolean(input.standaloneDisplay || input.iosStandalone);
  const canPrompt = Boolean(input.hasNativePrompt && !installed);

  if (installed) {
    return {
      platform,
      canPrompt: false,
      installed: true,
      title: "Installed",
      description: "Gather is running from the Home Screen.",
      steps: []
    };
  }

  if (platform === "ios") {
    return {
      platform,
      canPrompt,
      installed,
      title: "Install Gather",
      description: "Add Gather to your Home Screen so it opens like a private family app.",
      steps: ["Open this site in Safari.", "Tap Share.", "Choose Add to Home Screen.", "Tap Add."]
    };
  }

  if (platform === "android") {
    return {
      platform,
      canPrompt,
      installed,
      title: "Install Gather",
      description: "Install Gather so it opens full screen from your app launcher.",
      steps: canPrompt ? ["Tap Install.", "Confirm the browser prompt."] : ["Open the browser menu.", "Choose Install app or Add to Home screen.", "Confirm the prompt."]
    };
  }

  return {
    platform,
    canPrompt,
    installed,
    title: "Install Gather",
    description: "Install Gather from your browser for a dedicated app window.",
    steps: canPrompt ? ["Choose Install.", "Confirm the browser prompt."] : ["Open the browser install option.", "Confirm the prompt."]
  };
}
