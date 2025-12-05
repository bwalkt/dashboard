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
    title: 'Overview',
    url: '/overview',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['o', 'v'],
    items: [], // Empty array as there are no child items for Overview
  },
  {
    title: 'Organizations',
    url: '/orgs',
    icon: 'users',
    isActive: false,
    shortcut: ['o', 'r'],
    items: [], // Empty array as there are no child items for Organizations
  },
  {
    title: 'Tables',
    url: '#',
    icon: 'table',
    isActive: false,
    items: [
      {
        title: 'Users Table',
        url: '/users',
        icon: 'users',
        shortcut: ['u', 's'],
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
        url: '/logs',
        icon: 'infinity',
        shortcut: ['l', 'g'],
      },
    ],
  },
  {
    title: 'Proxy Targets',
    url: '/dashboard/proxy-targets',
    icon: 'network',
    shortcut: ['p', 't'],
  },
  {
    title: 'SigNoz',
    url: '/dashboard/signoz/traces',
    icon: 'activity',
    shortcut: ['s', 'z'],
  },
]
