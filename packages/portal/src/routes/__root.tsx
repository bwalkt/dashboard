import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useEffect } from 'react'
// @ts-expect-error no declaration file
import NProgress from 'nprogress'

function RootComponent() {
  return (
    <>
      <ProgressBar />
      <Outlet />
      <TanStackRouterDevtools />
    </>
  )
}

function ProgressBar() {
  const routerState = useRouterState()

  useEffect(() => {
    NProgress.start()
    NProgress.done()
  }, [routerState.location.pathname])

  return null
}

export const Route = createRootRoute({
  component: RootComponent,
})