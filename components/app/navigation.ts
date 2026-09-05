import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Car,
  ClipboardList,
  FileText,
  Goal,
  HeartHandshake,
  HeartPulse,
  Home,
  LayoutDashboard,
  MessageSquareText,
  PartyPopper,
  PiggyBank,
  ReceiptText,
  Settings,
  ShoppingCart,
  Utensils,
  UsersRound,
  KeyRound,
  WalletCards,
  MoreHorizontal
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
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "Daily Life",
    mobileTitle: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
    items: [
      { title: "Activities", href: "/activities", icon: PartyPopper },
      { title: "Tasks", href: "/tasks", icon: ClipboardList },
      { title: "Grocery", href: "/grocery", icon: ShoppingCart },
      { title: "Meals", href: "/meals", icon: Utensils },
      { title: "Communication", href: "/communication", icon: MessageSquareText }
    ]
  },
  {
    title: "Finances",
    href: "/finances",
    icon: PiggyBank,
    items: [
      { title: "Budget", href: "/budget", icon: WalletCards },
      { title: "Bills", href: "/bills", icon: ReceiptText },
      { title: "Accounts", href: "/accounts", icon: KeyRound }
    ]
  },
  {
    title: "Family Care",
    mobileTitle: "Family",
    href: "/health",
    icon: HeartPulse,
    items: [
      { title: "School", href: "/school", icon: BookOpen },
      { title: "Relationship", href: "/relationship", icon: HeartHandshake },
      { title: "Goals", href: "/goals", icon: Goal }
    ]
  },
  {
    title: "Household",
    mobileTitle: "Home",
    href: "/home",
    icon: Home,
    items: [
      { title: "Vehicles", href: "/vehicles", icon: Car },
      { title: "Documents", href: "/documents", icon: FileText },
      { title: "Contacts", href: "/contacts", icon: UsersRound },
      { title: "Emergency", href: "/emergency", icon: AlertTriangle }
    ]
  },
  { title: "Settings", href: "/settings", icon: Settings }
];

export const navigationSections: NavSection[] = navigationSectionInputs.map((section) => ({ ...section, items: section.items ?? [] }));

export const navItems = navigationSections.flatMap((section) => [
  { title: section.mobileTitle ?? section.title, href: section.href, icon: section.icon },
  ...section.items
]);

export const mobileNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Tasks", href: "/tasks", icon: ClipboardList },
  { title: "Grocery", href: "/grocery", icon: ShoppingCart },
  { title: "Finances", href: "/finances", icon: PiggyBank }
];

export const mobileMoreItem = { title: "More", href: "#more", icon: MoreHorizontal };
