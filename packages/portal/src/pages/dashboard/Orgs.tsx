import { useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import React from 'react'
import { CrudShell } from '@/components/crud-shell'
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
  const columns = createColumns()
  const orgs = useOrgsStore(state => state.orgs)
  const fetchOrgs = useOrgsStore(state => state.fetchOrgs)
  const [useFallback, setUseFallback] = React.useState(false)
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  // Fetch orgs when component mounts
  React.useEffect(() => {
    fetchOrgs()
      .then(() => setIsInitialized(true))
      .catch(error => {
        console.error('Failed to fetch orgs from API, using mock data:', error)
        setUseFallback(true)
        setIsInitialized(true)
        setError(error)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRetry = () => {
    setError(null)
    setIsInitialized(false)
    setUseFallback(false)
    fetchOrgs()
      .then(() => setIsInitialized(true))
      .catch(error => {
        console.error('Failed to fetch orgs from API, using mock data:', error)
        setUseFallback(true)
        setIsInitialized(true)
        setError(error)
      })
  }

  // Use API data if available, otherwise fallback to mock data
  // Always ensure data is an array to prevent DataTable crashes
  const data = useFallback ? orgData : orgs || []

  return (
    <CrudShell
      title="Organizations"
      description="Manage your organization accounts and settings."
      columns={columns}
      data={data}
      filterFields={filterFields}
      addButton={<AddOrgButton />}
      isLoading={!isInitialized}
      error={useFallback ? null : error}
      onRetry={handleRetry}
    />
  )
}
