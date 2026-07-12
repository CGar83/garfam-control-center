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
  KeyRound
} from "lucide-react";

export const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Activities", href: "/activities", icon: PartyPopper },
  { title: "Tasks", href: "/tasks", icon: ClipboardList },
  { title: "Grocery", href: "/grocery", icon: ShoppingCart },
  { title: "Meals", href: "/meals", icon: Utensils },
  { title: "Finances", href: "/finances", icon: PiggyBank },
  { title: "Bills", href: "/bills", icon: ReceiptText },
  { title: "Accounts", href: "/accounts", icon: KeyRound },
  { title: "Health", href: "/health", icon: HeartPulse },
  { title: "School", href: "/school", icon: BookOpen },
  { title: "Home", href: "/home", icon: Home },
  { title: "Vehicles", href: "/vehicles", icon: Car },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Contacts", href: "/contacts", icon: UsersRound },
  { title: "Communication", href: "/communication", icon: MessageSquareText },
  { title: "Relationship", href: "/relationship", icon: HeartHandshake },
  { title: "Emergency", href: "/emergency", icon: AlertTriangle },
  { title: "Goals", href: "/goals", icon: Goal },
  { title: "Settings", href: "/settings", icon: Settings }
] as const;

export const mobileNavItems = navItems.filter((item) =>
  ["/dashboard", "/calendar", "/activities", "/tasks", "/grocery", "/relationship", "/communication", "/settings"].includes(item.href)
);
