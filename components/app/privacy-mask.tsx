"use client";

import type { ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { maskValue } from "@/lib/utils";

interface PrivacyMaskProps {
  value?: string | number | null;
  children?: ReactNode;
  sensitive?: boolean;
  visibleChars?: number;
}

export function PrivacyMask({ value, children, sensitive = true, visibleChars = 0 }: PrivacyMaskProps) {
  const { privacyMode } = usePrivacyMode();

  if (!sensitive || !privacyMode) return <>{children ?? value ?? "—"}</>;

  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <EyeOff className="h-3.5 w-3.5" />
      {maskValue(value, visibleChars)}
    </span>
  );
}
