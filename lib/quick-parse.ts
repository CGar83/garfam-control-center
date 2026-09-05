import { addDays, format, nextDay, parse, setHours, setMinutes, startOfDay, isValid, type Day } from "date-fns";
import type { FamilyMember } from "@/lib/types";
import { firstName } from "@/lib/member-colors";

export type QuickKind = "event" | "task" | "grocery" | "transaction" | "note" | "memory";

export interface QuickParseResult {
  kind: QuickKind;
  title: string;
  /** ISO date-time when a time was given, ISO date when only a day was given. */
  date: string | null;
  hasTime: boolean;
  memberId: string | null;
  amount: number | null;
  /** Human sentence describing what will be created. */
  summary: string;
  raw: string;
}

const weekdayNames: Record<string, Day> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6
};

const groceryWords = [
  "milk",
  "eggs",
  "bread",
  "butter",
  "cheese",
  "yogurt",
  "apples",
  "bananas",
  "chicken",
  "beef",
  "rice",
  "pasta",
  "cereal",
  "coffee",
  "diapers",
  "wipes",
  "paper towels",
  "toilet paper",
  "dog food",
  "snacks",
  "juice",
  "lettuce",
  "tomatoes",
  "onions",
  "flour",
  "sugar"
];

const eventWords = [
  "appointment",
  "appt",
  "dentist",
  "doctor",
  "pediatrician",
  "orthodontist",
  "practice",
  "game",
  "match",
  "meeting",
  "party",
  "recital",
  "concert",
  "pickup",
  "drop off",
  "dropoff",
  "playdate",
  "lesson",
  "class",
  "dinner with",
  "lunch with",
  "date night",
  "birthday party",
  "field trip",
  "conference",
  "tryouts",
  "rehearsal",
  "haircut",
  "vet"
];

const taskVerbs = [
  "pay",
  "call",
  "sign",
  "email",
  "schedule",
  "book",
  "fix",
  "return",
  "renew",
  "order",
  "submit",
  "register",
  "cancel",
  "mail",
  "print",
  "fill out",
  "finish",
  "clean",
  "wash",
  "organize",
  "research",
  "text",
  "rsvp",
  "drop",
  "send"
];

function clean(text: string) {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[-:,]+\s*/, "")
    .replace(/\s*[-:,]+\s*$/, "")
    .trim();
}

function capitalize(text: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function parseTime(text: string): { hours: number; minutes: number; match: string } | null {
  const explicit = text.match(/\b(?:at\s+)?((1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm|a\.m\.|p\.m\.))\b/i);
  if (explicit) {
    let hours = Number(explicit[2]);
    const minutes = explicit[3] ? Number(explicit[3]) : 0;
    const meridiem = explicit[4].toLowerCase().replace(/\./g, "");
    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    return { hours, minutes, match: explicit[0] };
  }
  const twentyFour = text.match(/\bat\s+((?:[01]?\d|2[0-3]):([0-5]\d))\b/);
  if (twentyFour) return { hours: Number(twentyFour[1].split(":")[0]), minutes: Number(twentyFour[2]), match: twentyFour[0] };
  if (/\bnoon\b/i.test(text)) return { hours: 12, minutes: 0, match: text.match(/\b(?:at\s+)?noon\b/i)?.[0] ?? "noon" };
  if (/\bmidnight\b/i.test(text)) return { hours: 0, minutes: 0, match: text.match(/\b(?:at\s+)?midnight\b/i)?.[0] ?? "midnight" };
  return null;
}

function parseDay(text: string, today: Date): { date: Date; match: string } | null {
  const base = startOfDay(today);
  const lower = text.toLowerCase();

  const relative = lower.match(/\b(today|tonight|this evening|this morning|this afternoon|tomorrow|tmrw|day after tomorrow)\b/);
  if (relative) {
    const word = relative[1];
    const date = word === "day after tomorrow" ? addDays(base, 2) : word.startsWith("tom") || word === "tmrw" ? addDays(base, 1) : base;
    return { date, match: relative[0] };
  }

  const inDays = lower.match(/\bin\s+(\d{1,2})\s+(day|days|week|weeks)\b/);
  if (inDays) {
    const count = Number(inDays[1]);
    const date = inDays[2].startsWith("week") ? addDays(base, count * 7) : addDays(base, count);
    return { date, match: inDays[0] };
  }

  const weekday = lower.match(/\b(?:(next|this)\s+)?(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)\b/);
  if (weekday) {
    const day = weekdayNames[weekday[2]];
    // "next Friday" said on a Friday means a week out; nextDay already skips today.
    const date = nextDay(base, day);
    return { date, match: weekday[0] };
  }

  const numeric = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3] ? (numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3])) : base.getFullYear();
    let date = new Date(year, Number(numeric[1]) - 1, Number(numeric[2]));
    if (!numeric[3] && date < base) date = new Date(year + 1, Number(numeric[1]) - 1, Number(numeric[2]));
    return isValid(date) ? { date, match: numeric[0] } : null;
  }

  const monthName = lower.match(
    /\b(?:on\s+)?(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/
  );
  if (monthName) {
    const monthToken = monthName[1].slice(0, 3);
    let date = parse(`${monthToken} ${monthName[2]} ${base.getFullYear()}`, "MMM d yyyy", base);
    if (isValid(date) && date < base) date = parse(`${monthToken} ${monthName[2]} ${base.getFullYear() + 1}`, "MMM d yyyy", base);
    return isValid(date) ? { date, match: monthName[0] } : null;
  }

  const ordinal = lower.match(/\b(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)\b/);
  if (ordinal) {
    let date = new Date(base.getFullYear(), base.getMonth(), Number(ordinal[1]));
    if (date < base) date = new Date(base.getFullYear(), base.getMonth() + 1, Number(ordinal[1]));
    return isValid(date) ? { date, match: ordinal[0] } : null;
  }

  return null;
}

function parseMember(text: string, members: FamilyMember[]): { member: FamilyMember; match: string } | null {
  for (const member of members) {
    const first = firstName(member.display_name);
    if (!first) continue;
    const escaped = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const forPattern = new RegExp(`\\b(?:for|with)\\s+${escaped}\\b`, "i");
    const possessive = new RegExp(`\\b${escaped}'s\\b`, "i");
    const bare = new RegExp(`\\b${escaped}\\b`, "i");
    const match = text.match(forPattern) ?? text.match(possessive) ?? text.match(bare);
    if (match) return { member, match: match[0] };
  }
  return null;
}

function removeToken(text: string, token?: string | null) {
  if (!token) return text;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`\\s*${escaped}\\s*`, "i"), " ");
}

export function quickParse(input: string, members: FamilyMember[] = [], today = new Date()): QuickParseResult {
  const raw = input.trim();
  let working = raw;
  const lower = raw.toLowerCase();

  const explicitKind: QuickKind | null = /^(note|remember)\b[:\s]/i.test(raw)
    ? "note"
    : /^(memory|moment)\b[:\s]/i.test(raw)
      ? "memory"
      : /^(buy|get|grab|pick up|need|groceries?)\b/i.test(raw)
        ? "grocery"
        : /^(event|appt|appointment)\b[:\s]/i.test(raw)
          ? "event"
          : /^(task|todo|to-do)\b[:\s]/i.test(raw)
            ? "task"
            : /^(spent|paid|expense)\b/i.test(raw)
              ? "transaction"
              : null;

  if (explicitKind) {
    working = working.replace(/^(note|remember|memory|moment|event|appt|appointment|task|todo|to-do|groceries?|need|buy|get|grab|pick up|spent|paid|expense)\b[:\s]*/i, "");
  }

  const amountMatch = raw.match(/\$\s?(\d+(?:\.\d{1,2})?)/) ?? raw.match(/\b(\d+(?:\.\d{1,2})?)\s?(?:dollars|bucks)\b/i);
  const amount = amountMatch ? Number(amountMatch[1]) : null;
  if (amountMatch) working = removeToken(working, amountMatch[0]);

  const time = parseTime(working);
  if (time) working = removeToken(working, time.match);

  const day = parseDay(working, today);
  if (day) working = removeToken(working, day.match);

  const person = parseMember(working, members);
  if (person) {
    // Keep the name in the title when it is a possessive ("Lily's recital"), drop "for Lily".
    if (/^(for|with)\s/i.test(person.match)) working = removeToken(working, person.match);
  }

  working = clean(working.replace(/\b(at|on)\s*$/i, "").replace(/^\s*(at|on)\b\s*/i, ""));

  let kind: QuickKind = explicitKind ?? "task";
  if (!explicitKind) {
    if (amount !== null) kind = "transaction";
    else if (groceryWords.some((word) => lower.includes(word)) && !day && !time) kind = "grocery";
    else if (time || eventWords.some((word) => lower.includes(word))) kind = "event";
    else if (taskVerbs.some((verb) => new RegExp(`\\b${verb}\\b`, "i").test(lower))) kind = "task";
    else if (day) kind = "task";
    else kind = "task";
  }

  let date: string | null = null;
  const hasTime = Boolean(time);
  if (day || time) {
    const baseDay = day?.date ?? startOfDay(today);
    if (time) {
      const withTime = setMinutes(setHours(baseDay, time.hours), time.minutes);
      const finalDate = !day && withTime < today ? addDays(withTime, 1) : withTime;
      date = finalDate.toISOString();
    } else {
      date = format(baseDay, "yyyy-MM-dd");
    }
  }
  if (kind === "event" && !date) {
    date = format(startOfDay(today), "yyyy-MM-dd");
  }
  if (kind === "transaction" && !date) date = format(startOfDay(today), "yyyy-MM-dd");
  if (kind === "memory" && !date) date = format(startOfDay(today), "yyyy-MM-dd");

  const title = capitalize(working) || capitalize(raw);
  const who = person ? ` for ${firstName(person.member.display_name)}` : "";
  const when = date ? (hasTime ? ` on ${format(new Date(date), "EEE MMM d 'at' h:mm a")}` : ` on ${format(new Date(`${date}T00:00:00`), "EEE MMM d")}`) : "";

  const summaryByKind: Record<QuickKind, string> = {
    event: `Add event "${title}"${who}${when}`,
    task: `Add task "${title}"${who}${when ? `, due${when}` : ""}`,
    grocery: `Add "${title}" to the grocery list`,
    transaction: `Log ${amount !== null ? `$${amount.toFixed(2)} ` : ""}expense "${title}"`,
    note: `Post family note "${title}"`,
    memory: `Save memory "${title}"${when}`
  };

  return {
    kind,
    title,
    date,
    hasTime,
    memberId: person?.member.id ?? null,
    amount,
    summary: summaryByKind[kind],
    raw
  };
}

export const quickExamples = [
  "Dentist for Lily tomorrow 3pm",
  "Buy milk and eggs",
  "Pay water bill Friday",
  "$42 gas",
  "Noah's soccer game Saturday 10am",
  "Remember: Grandma calls Sunday",
  "Memory: Lily rode without training wheels"
];
