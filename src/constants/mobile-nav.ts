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
    icon: 'users',
    shortcut: ['a', 'a'],
    isActive: false,
    items: []
  },
  {
    title: 'Opportunities',
    url: '/dashboard/opportunities',
    icon: 'target',
    shortcut: ['p', 'p'],
    isActive: false,
    items: []
  },
  {
    title: 'Leads',
    url: '/dashboard/leads',
    icon: 'userPlus',
    shortcut: ['l', 'l'],
    isActive: false,
    items: []
  },
  {
    title: 'Data',
    url: '/dashboard/data',
    icon: 'database',
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