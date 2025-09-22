import { NavItem } from '@/types';

// Mobile-specific navigation items with correct routes
export const mobileNavItems: NavItem[] = [
  {
    title: 'Overview',
    url: '/dashboard/overview',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['o', 'o'],
    items: []
  },
  {
    title: 'Accounts',
    url: '/dashboard/accounts',
    icon: 'user',
    shortcut: ['a', 'a'],
    isActive: false,
    items: []
  },
  {
    title: 'Opportunities',
    url: '/dashboard/opportunities',
    icon: 'billing',
    shortcut: ['p', 'p'],
    isActive: false,
    items: []
  },
  {
    title: 'Leads',
    url: '/dashboard/leads',
    icon: 'add',
    shortcut: ['l', 'l'],
    isActive: false,
    items: []
  },
  {
    title: 'Data',
    url: '/dashboard/data',
    icon: 'page',
    shortcut: ['d', 'd'],
    isActive: false,
    items: []
  },
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: 'settings',
    shortcut: ['s', 's'],
    isActive: false,
    items: []
  }
];