import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
// @ts-expect-error no declaration file
import NProgress from 'nprogress'
import { useEffect } from 'react'

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