import { NavItem } from "@/types";

// Mobile-specific navigation items with correct routes
export const mobileNavItems: NavItem[] = [
  {
    title: "Overview",
    url: "/dashboard/overview",
    icon: "dashboard",
    isActive: false,
    shortcut: ["o", "o"],
    items: [],
  },
];
