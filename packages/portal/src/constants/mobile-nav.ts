import type { NavItem } from '@/types'

// Mobile-specific navigation items with correct routes
export const mobileNavItems: NavItem[] = [
  {
    title: 'Overview',
    url: '/dashboard/overview',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['o', 'o'],
    items: [],
  },
  {
    title: 'Logs',
    url: '/dashboard/logs',
    icon: 'activity',
    isActive: false,
    shortcut: ['l', 'l'],
    items: [],
  },
  {
    title: 'Users',
    url: '/dashboard/users',
    icon: 'users',
    isActive: false,
    shortcut: ['u', 'u'],
    items: [],
  },
]
