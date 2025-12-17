import { useNavigate } from '@tanstack/react-router'
import { DataTable } from '@/app/data-table'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { createColumns } from '@/features/orgs/components/columns'
import { filterFields } from '@/features/orgs/constants'
import { orgData } from '@/features/orgs/data'

export default function OrgsPage() {
  const navigate = useNavigate()
  const columns = createColumns()

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
