"use client";

import { useAppData } from "@/components/app/providers";

export function useFamily() {
  const {
    data,
    familyId,
    currentUser,
    currentMember,
    currentMemberId,
    createWorkspace,
    updateFamilyName,
    restoreStarterData,
    usingLocalData,
    supabaseConfigured
  } = useAppData();

  return {
    family: data.families.find((family) => family.id === familyId) ?? data.families[0],
    familyId,
    currentUser,
    currentMember,
    currentMemberId,
    createWorkspace,
    updateFamilyName,
    restoreStarterData,
    usingLocalData,
    supabaseConfigured
  };
}
