import type { ListItem, ListKind, SharedList } from "@/lib/types";

export const kindLabels: Record<ListKind, string> = {
  todo: "To-do",
  shopping: "Shopping",
  packing: "Packing",
  wishlist: "Wishlist",
  project: "Project",
  custom: "Custom"
};

/** Parses "2x Sunscreen", "2 x Sunscreen", "Sunscreen x2" into a name and quantity. */
export function parseItemInput(raw: string): { name: string; quantity: string | null } {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return { name: "", quantity: null };

  const leading = trimmed.match(/^(\d+)\s*[x×X]\s*(.+)$/);
  if (leading) return { name: leading[2].trim(), quantity: leading[1] };

  const trailing = trimmed.match(/^(.+?)\s+[x×X]\s*(\d+)$/);
  if (trailing) return { name: trailing[1].trim(), quantity: trailing[2] };

  const parenthetical = trimmed.match(/^(.+?)\s*\((\d+)\)$/);
  if (parenthetical) return { name: parenthetical[1].trim(), quantity: parenthetical[2] };

  return { name: trimmed, quantity: null };
}

export function itemsForList(items: ListItem[], listId: string) {
  return items.filter((item) => item.list_id === listId).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

export function listProgress(items: ListItem[]) {
  const total = items.length;
  const done = items.filter((item) => item.checked).length;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function listAssignees(items: ListItem[]) {
  return Array.from(new Set(items.map((item) => item.assigned_to).filter((id): id is string => Boolean(id))));
}

export function listLastUpdated(list: SharedList, items: ListItem[]) {
  const stamps = [list.updated_at, ...items.map((item) => item.updated_at)].filter(Boolean);
  const latest = stamps.reduce((max, stamp) => (stamp > max ? stamp : max), stamps[0] ?? list.created_at);
  const parsed = new Date(latest);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function nextSortOrder(items: ListItem[]) {
  return items.reduce((max, item) => Math.max(max, item.sort_order), -1) + 1;
}

export interface ListTemplate {
  id: string;
  name: string;
  emoji: string;
  kind: ListKind;
  description: string;
  blurb: string;
  items: string[];
}

export const listTemplates: ListTemplate[] = [
  {
    id: "packing-beach",
    name: "Beach trip packing",
    emoji: "🧳",
    kind: "packing",
    description: "Everything for a sunny week by the water.",
    blurb: "Sunscreen, towels, and the stuff you always forget.",
    items: ["Sunscreen x2", "Beach towels", "Swimsuits", "Sun hats", "Sandals", "Beach toys", "Cooler and ice packs", "Snacks", "Books and card games", "Chargers", "First-aid kit", "Reusable water bottles"]
  },
  {
    id: "packing-camping",
    name: "Camping packing",
    emoji: "🏕️",
    kind: "packing",
    description: "Tent to s'mores, all in one place.",
    blurb: "Tent, sleeping bags, lanterns, marshmallows.",
    items: ["Tent and stakes", "Sleeping bags", "Sleeping pads", "Headlamps and lantern", "Camp stove and fuel", "Cooler", "Marshmallows and s'mores kit", "Bug spray", "Layers and rain jackets", "Firewood or fire starter", "Trash bags", "Camp chairs"]
  },
  {
    id: "packing-weekend",
    name: "Weekend trip packing",
    emoji: "✈️",
    kind: "packing",
    description: "Two nights away, nothing forgotten.",
    blurb: "A light list for a quick getaway.",
    items: ["Pajamas", "Outfits x2", "Toiletries", "Toothbrushes", "Phone chargers", "Kids' comfort items", "Snacks for the car", "Medications", "Reusable water bottles", "Something to read"]
  },
  {
    id: "weekend-todos",
    name: "Weekend to-dos",
    emoji: "🏠",
    kind: "todo",
    description: "Small wins for Saturday morning.",
    blurb: "Chores and errands to knock out together.",
    items: ["Tidy the garage", "Water the plants", "Return library books", "Meal prep for the week", "Wash the car", "Sort the mail pile", "Plan next week's calendar", "Family walk"]
  },
  {
    id: "party-planning",
    name: "Party planning",
    emoji: "🎉",
    kind: "project",
    description: "From invites to cleanup.",
    blurb: "Guest list, cake, decorations, thank-yous.",
    items: ["Pick a date and time", "Guest list", "Send invites", "Order the cake", "Decorations and balloons", "Plan games or activities", "Food and drinks", "Party favors", "Camera charged", "Thank-you notes"]
  },
  {
    id: "back-to-school",
    name: "Back to school",
    emoji: "🎒",
    kind: "project",
    description: "Supplies, forms, and first-day prep.",
    blurb: "Backpacks, forms, haircuts, lunchbox plan.",
    items: ["School supply list", "New backpacks", "Lunch boxes and water bottles", "Shoes that fit", "Haircuts", "Update emergency contacts", "Sign school forms", "Set bedtime routine", "First-day photo spot", "Meet the teacher"]
  },
  {
    id: "babysitter-info",
    name: "Baby-sitter info",
    emoji: "📝",
    kind: "custom",
    description: "Everything a sitter needs in one place.",
    blurb: "Bedtimes, allergies, emergency numbers.",
    items: ["Our cell numbers", "Neighbor's number", "Pediatrician and poison control", "Allergies and medications", "Bedtime routine and times", "Approved snacks", "Screen-time rules", "Wi-Fi password", "Where the first-aid kit lives", "Pet care notes"]
  }
];
