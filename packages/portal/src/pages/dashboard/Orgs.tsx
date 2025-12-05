import * as React from 'react'
import { DataTable } from '@/app/data-table'
import { columns } from '@/features/orgs/components/columns'
import { filterFields } from '@/features/orgs/constants'
import { orgData } from '@/features/orgs/data'

export default function OrgsPage() {
  // Override SidebarInset margins for full-width table
  React.useEffect(() => {
    const sidebarInset = document.querySelector('[data-slot="sidebar-inset"]')
    if (sidebarInset) {
      sidebarInset.classList.add('!m-0')
    }

    return () => {
      if (sidebarInset) {
        sidebarInset.classList.remove('!m-0')
      }
    }
  }, [])

  return (
    <DataTable
      columns={columns}
      data={orgData}
      filterFields={filterFields}
      title="Organizations"
      description="Manage your organization accounts and settings."
      containerPadding={false}
    />
  )
}
