"use client";

import { useToastContext } from "@/components/app/providers";

export function useToast() {
  return useToastContext();
}
