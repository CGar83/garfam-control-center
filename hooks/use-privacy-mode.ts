"use client";

import { usePrivacyContext } from "@/components/app/providers";

export function usePrivacyMode() {
  return usePrivacyContext();
}
