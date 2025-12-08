import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/signoz')({
  component: SignozLayout,
})

function SignozLayout() {
  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto py-6 space-y-6 px-4 md:px-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">SigNoz Traces</h1>
          <p className="text-muted-foreground">Query and explore traces from your SigNoz instance</p>
        </div>

        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
