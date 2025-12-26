import { useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import React from 'react'
import { DataTable } from '@/app/data-table'
import { Button } from '@/components/ui/button'
import { createColumns } from '@/features/orgs/components/columns'
import { filterFields } from '@/features/orgs/constants'
import { orgData } from '@/features/orgs/data'
import { useOrgsStore } from '@/stores/orgs'

const AddOrgButton = () => {
  const navigate = useNavigate()
  return (
    <Button onClick={() => navigate({ to: '/orgs/new' })}>
      <PlusIcon className="mr-2 h-4 w-4" />
      Add Organization
    </Button>
  )
}

export default function OrgsPage() {
  const navigate = useNavigate()
  const columns = createColumns()
  const orgs = useOrgsStore(state => state.orgs)
  const fetchOrgs = useOrgsStore(state => state.fetchOrgs)
  const [useFallback, setUseFallback] = React.useState(false)
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Fetch orgs when component mounts
  React.useEffect(() => {
    fetchOrgs()
      .then(() => setIsInitialized(true))
      .catch(error => {
        console.error('Failed to fetch orgs from API, using mock data:', error)
        setUseFallback(true)
        setIsInitialized(true)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Use API data if available, otherwise fallback to mock data
  // Always ensure data is an array to prevent DataTable crashes
  const data = useFallback ? orgData : orgs || []

  // Show loading state until we have valid data
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

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
