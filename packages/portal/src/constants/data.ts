import type { NavItem } from '@/types'
export type Product = {
  Id: string
  Name: string
  ProductCode: string | null
  Description: string
  IsActive: boolean
  CreatedDate: string
  CreatedById: string
  LastModifiedDate: string
  LastModifiedById: string
  SystemModstamp: string
  Family: string | null
  ExternalDataSourceId: string | null
  ExternalId: string | null
  DisplayUrl: string | null
  QuantityUnitOfMeasure: string | null
  IsDeleted: boolean
  IsArchived: boolean
  LastViewedDate: string
  LastReferencedDate: string
  StockKeepingUnit: string | null
  Type: string | null
  ProductClass: string
  Product_Category__c: string
  Unit_Price__c: number
  Cost_Per_Unit__c: number
  External_Id__c: string | null
}

//Info: The following data is used for the sidebar navigation and Cmd K bar.
export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard/overview',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['d', 'd'],
    items: [], // Empty array as there are no child items for Dashboard
  },
  {
    title: 'Tables',
    url: '#',
    icon: 'table',
    isActive: false,
    items: [
      {
        title: 'Users Table',
        url: '/dashboard/users',
        icon: 'users',
        shortcut: ['t', 'b'],
      },
      {
        title: 'Avatar Table',
        url: '/table',
        icon: 'user',
        shortcut: ['a', 'v'],
      },
      {
        title: 'Tree Table',
        url: '/data-table/tree',
        icon: 'tree',
        shortcut: ['t', 'r'],
      },
      {
        title: 'Logs',
        url: '/dashboard/logs',
        icon: 'infinity',
        shortcut: ['l', 'g'],
      },
    ],
  },
]
