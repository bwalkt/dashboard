import { useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { DataTable } from '@/app/data-table'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
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

  const AddOrgButton = () => (
    <Button onClick={() => navigate({ to: '/orgs/new' })}>
      <Icons.add className="mr-2 h-4 w-4" />
      Add Organization
    </Button>
  )

  return (
    <DataTable
      columns={columns}
      data={orgData}
      filterFields={filterFields}
      title="Organizations"
      description="Manage your organization accounts and settings."
      containerPadding={false}
      cellPadding="sm"
      groupByComponent={<AddOrgButton />}
    />
  )
}
