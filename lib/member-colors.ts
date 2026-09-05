import type { FamilyMember, MemberColor } from "@/lib/types";

export interface MemberPalette {
  /** Solid fill for avatars and calendar chips. */
  solid: string;
  /** Text color that reads on the solid fill. */
  onSolid: string;
  /** Soft tint for backgrounds. */
  soft: string;
  /** Darker ink for text on the soft tint. */
  ink: string;
  /** Border for outlines. */
  border: string;
  label: string;
}

export const memberPalettes: Record<MemberColor, MemberPalette> = {
  coral: { solid: "#F0705A", onSolid: "#FFFFFF", soft: "#FDE8E3", ink: "#8E3A2B", border: "#F5A797", label: "Coral" },
  ocean: { solid: "#3B82C4", onSolid: "#FFFFFF", soft: "#E1EEFB", ink: "#1F4C78", border: "#93BDE6", label: "Ocean" },
  sunshine: { solid: "#F2B233", onSolid: "#3F2B00", soft: "#FDF1D2", ink: "#7A5200", border: "#F7D485", label: "Sunshine" },
  meadow: { solid: "#4CAF6E", onSolid: "#FFFFFF", soft: "#E0F3E6", ink: "#20603A", border: "#9AD4AE", label: "Meadow" },
  lavender: { solid: "#8B6CD6", onSolid: "#FFFFFF", soft: "#ECE6FA", ink: "#4A3388", border: "#BCA9EA", label: "Lavender" },
  sky: { solid: "#3BB8D6", onSolid: "#083944", soft: "#DDF3F8", ink: "#0F5C6C", border: "#93DAE8", label: "Sky" },
  peach: { solid: "#F59A6B", onSolid: "#4A2410", soft: "#FDEBE0", ink: "#8A4A22", border: "#F8C1A4", label: "Peach" },
  rose: { solid: "#E06B9A", onSolid: "#FFFFFF", soft: "#FBE4EE", ink: "#7E2F52", border: "#EFA9C6", label: "Rose" }
};

export const memberColorOrder: MemberColor[] = ["coral", "ocean", "lavender", "meadow", "sunshine", "sky", "peach", "rose"];

const neutralPalette: MemberPalette = {
  solid: "#8A8A93",
  onSolid: "#FFFFFF",
  soft: "#ECECF1",
  ink: "#3F3F46",
  border: "#C9C9D2",
  label: "Neutral"
};

/**
 * Resolve a member's palette. Members without an explicit color get a stable
 * fallback based on their position in the family so siblings never collide.
 */
export function paletteForMember(member: FamilyMember | null | undefined, members: FamilyMember[] = []): MemberPalette {
  if (!member) return neutralPalette;
  if (member.color && member.color in memberPalettes) return memberPalettes[member.color];
  const index = Math.max(0, members.findIndex((item) => item.id === member.id));
  return memberPalettes[memberColorOrder[index % memberColorOrder.length]];
}

export function paletteForColor(color?: MemberColor | null): MemberPalette {
  return color && color in memberPalettes ? memberPalettes[color] : neutralPalette;
}

/** Pick the first palette color not already used by another member. */
export function nextAvailableColor(members: FamilyMember[]): MemberColor {
  const used = new Set(members.map((member) => member.color).filter(Boolean));
  return memberColorOrder.find((color) => !used.has(color)) ?? memberColorOrder[members.length % memberColorOrder.length];
}

export function memberInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function firstName(name?: string | null) {
  return (name ?? "").trim().split(/\s+/)[0] || "";
}
