import { describe, expect, it } from "vitest";
import { blockedSectionForPath, memberCanAccessPath, memberCanAccessSection } from "@/lib/access-control";
import type { FamilyMember } from "@/lib/types";

const viewer: FamilyMember = {
  id: "member_child",
  family_id: "family",
  user_id: "user_child",
  display_name: "Teen Child",
  role: "viewer",
  avatar_url: null,
  phone: null,
  email: "teen@example.test",
  relationship: "Child",
  birthdate: "2012-02-01",
  age_label: "14",
  blocked_sections: ["finances", "relationship"],
  created_at: "2026-09-04T00:00:00.000Z",
  updated_at: "2026-09-04T00:00:00.000Z"
};

const parent: FamilyMember = {
  ...viewer,
  id: "member_parent",
  display_name: "Parent",
  role: "parent",
  blocked_sections: ["finances", "relationship"]
};

describe("member access control", () => {
  it("maps sensitive routes to access sections", () => {
    expect(blockedSectionForPath("/relationship")).toBe("relationship");
    expect(blockedSectionForPath("/budget?record=abc")).toBe("finances");
    expect(blockedSectionForPath("/calendar")).toBeNull();
  });

  it("blocks viewer profiles from restricted sections", () => {
    expect(memberCanAccessPath(viewer, "/relationship")).toBe(false);
    expect(memberCanAccessPath(viewer, "/budget")).toBe(false);
    expect(memberCanAccessPath(viewer, "/calendar")).toBe(true);
  });

  it("keeps parent and admin roles unrestricted", () => {
    expect(memberCanAccessSection(parent, "finances")).toBe(true);
  });
});
