import { useNavigate } from '@tanstack/react-router'
import React from 'react'
import { DataTable } from '@/app/data-table'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { createColumns } from '@/features/orgs/components/columns'
import { filterFields } from '@/features/orgs/constants'
import { orgData } from '@/features/orgs/data'
import { useOrgsStore } from '@/stores/orgs'

export default function OrgsPage() {
  const navigate = useNavigate()
  const columns = createColumns()
  const orgsStore = useOrgsStore()
  const [useFallback, setUseFallback] = React.useState(false)

  // Fetch orgs when component mounts
  React.useEffect(() => {
    orgsStore.fetchOrgs().catch(error => {
      console.error('Failed to fetch orgs from API, using mock data:', error)
      setUseFallback(true)
    })
  }, []) // Remove orgsStore dependency to prevent infinite loop

  const AddOrgButton = () => (
    <Button onClick={() => navigate({ to: '/orgs/new' })}>
      <Icons.add className="mr-2 h-4 w-4" />
      Add Organization
    </Button>
  )

  // Use API data if available, otherwise fallback to mock data
  const data = useFallback ? orgData : orgsStore.orgs

  return (
    <DataTable
      columns={columns}
      data={data}
      filterFields={filterFields}
      title="Organizations"
      description="Manage your organization accounts and settings."
      containerPadding={false}
      cellPadding="sm"
      groupByComponent={<AddOrgButton />}
    />
  )
}
