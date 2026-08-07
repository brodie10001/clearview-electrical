import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Briefcase, Building2, Users, Wallet } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Properties", href: "/properties", icon: Building2 },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Finances", href: "/finances", icon: Wallet },
];
