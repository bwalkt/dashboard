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
  {
    title: "Products",
    url: "/dashboard/products",
    icon: "product",
    shortcut: ["d", "d"],
    isActive: false,
    items: [],
  },
  {
    title: "Orders",
    url: "/dashboard/orders",
    icon: "billing",
    shortcut: ["o", "o"],
    isActive: false,
    items: [],
  },
];
