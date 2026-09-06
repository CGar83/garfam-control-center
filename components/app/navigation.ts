import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CalendarHeart,
  Car,
  ChefHat,
  ClipboardList,
  FileText,
  Goal,
  HeartHandshake,
  HeartPulse,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  MoreHorizontal,
  PartyPopper,
  PiggyBank,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sparkles,
  Sunrise,
  Sun,
  Trophy,
  UsersRound,
  Utensils,
  WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = NavItem & {
  mobileTitle?: string;
  items: NavItem[];
};

type NavSectionInput = NavItem & {
  mobileTitle?: string;
  items?: NavItem[];
};

const navigationSectionInputs: NavSectionInput[] = [
  { title: "Today", href: "/today", icon: Sun },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  {
    title: "Family",
    href: "/chores",
    icon: Trophy,
    items: [
      { title: "Chores & Rewards", href: "/chores", icon: Trophy },
      { title: "Routines", href: "/routines", icon: Sunrise },
      { title: "Tasks", href: "/tasks", icon: ClipboardList },
      { title: "Memories", href: "/memories", icon: Sparkles },
      { title: "Activities", href: "/activities", icon: PartyPopper },
      { title: "Goals", href: "/goals", icon: Goal }
    ]
  },
  {
    title: "Lists & Meals",
    mobileTitle: "Lists",
    href: "/grocery",
    icon: ShoppingCart,
    items: [
      { title: "Grocery", href: "/grocery", icon: ShoppingCart },
      { title: "Shared Lists", href: "/lists", icon: ListChecks },
      { title: "Meal Plan", href: "/meals", icon: Utensils },
      { title: "Recipe Box", href: "/recipes", icon: ChefHat }
    ]
  },
  {
    title: "Us",
    href: "/checkin",
    icon: HeartHandshake,
    items: [
      { title: "Daily Check-in", href: "/checkin", icon: MessageSquareText },
      { title: "Weekly Plan", href: "/planning", icon: CalendarHeart },
      { title: "Relationship", href: "/relationship", icon: HeartHandshake },
      { title: "Notes Board", href: "/communication", icon: MessageSquareText }
    ]
  },
  {
    title: "Money",
    href: "/finances",
    icon: PiggyBank,
    items: [
      { title: "Budget & Cards", href: "/budget", icon: WalletCards },
      { title: "Bills", href: "/bills", icon: ReceiptText },
      { title: "Accounts", href: "/accounts", icon: KeyRound }
    ]
  },
  {
    title: "Records",
    href: "/health",
    icon: Home,
    items: [
      { title: "Health", href: "/health", icon: HeartPulse },
      { title: "School", href: "/school", icon: BookOpen },
      { title: "Home", href: "/home", icon: Home },
      { title: "Vehicles", href: "/vehicles", icon: Car },
      { title: "Documents", href: "/documents", icon: FileText },
      { title: "Contacts", href: "/contacts", icon: UsersRound },
      { title: "Emergency", href: "/emergency", icon: AlertTriangle }
    ]
  },
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Settings", href: "/settings", icon: Settings }
];

export const navigationSections: NavSection[] = navigationSectionInputs.map((section) => ({ ...section, items: section.items ?? [] }));

export const navItems = navigationSections.flatMap((section) => [
  { title: section.mobileTitle ?? section.title, href: section.href, icon: section.icon },
  ...section.items
]);

/** Four bottom tabs; the quick-add button sits in the middle. */
export const mobileNavItems = [
  { title: "Today", href: "/today", icon: Sun },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Family", href: "/chores", icon: Trophy },
  { title: "Lists", href: "/grocery", icon: ShoppingCart }
];

export const mobileMoreItem = { title: "More", href: "#more", icon: MoreHorizontal };
