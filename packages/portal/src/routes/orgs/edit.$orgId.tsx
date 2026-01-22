import type { Org } from '@pzero/shared/pzero'
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { OrgDrawer } from '@/features/orgs/components/org-drawer'
import { orgData } from '@/features/orgs/data'
import DashboardLayout from '@/pages/dashboard/Layout'
import OrgsPage from '@/pages/dashboard/Orgs'
import { useOrgsStore } from '@/stores/orgs'

export const Route = createFileRoute('/orgs/edit/$orgId')({
  component: EditOrgPageWithLayout,
})

function EditOrgPageWithLayout() {
  const navigate = useNavigate()
  const { orgId } = useParams({ from: '/orgs/edit/$orgId' })
  const orgsStore = useOrgsStore()
  const [org, setOrg] = useState<Org | undefined>()
  const [loading, setLoading] = useState(true)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    if (orgId) {
      setLoading(true)

      // Try to find org in store first
      const foundOrg = orgsStore.orgs?.find(o => o.id === orgId)
      if (foundOrg) {
        setOrg(foundOrg)
        setLoading(false)
        return
      }

      // If not in store, try to fetch from API
      orgsStore
        .fetchOrg(orgId)
        .then(fetchedOrg => {
          setOrg(fetchedOrg)
          setLoading(false)
        })
        .catch(error => {
          console.error('Failed to fetch org from API, trying fallback data:', error)
          // Use fallback mock data
          const fallbackOrg = orgData.find(o => o.id === orgId)
          if (fallbackOrg) {
            setOrg(fallbackOrg)
            setUseFallback(true)
          } else {
            console.error('Org not found in fallback data either')
            // Navigate back if org not found anywhere
            navigate({ to: '/orgs' })
          }
          setLoading(false)
        })
    }
  }, [orgId, navigate, orgsStore])

  const handleClose = () => {
    navigate({ to: '/orgs' })
  }

  const handleUpdate = async (updatedOrg: Org) => {
    setOrg(updatedOrg)
    // Only refresh from API if not using fallback data
    if (!useFallback) {
      try {
        await orgsStore.fetchOrgs()
      } catch (error) {
        console.error('Failed to refresh orgs list:', error)
        toast.error('Failed to refresh organizations list')
      }
    }
    navigate({ to: '/orgs' })
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <OrgsPage />
        {org && (
          <OrgDrawer
            org={org}
            open={true}
            onOpenChange={open => {
              if (!open) handleClose()
            }}
            onUpdate={handleUpdate}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}
