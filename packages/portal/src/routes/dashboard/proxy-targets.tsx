import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ProxyTargetsPage } from './proxy-targets-components'

export const Route = createFileRoute('/dashboard/proxy-targets')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ProxyTargetsPage />
    </Suspense>
  )
}
