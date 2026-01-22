import { SignozClient } from './client'

export default function Page() {
  // In Vite/React, we don't need to prefetch on the server side
  // The Client component will handle data fetching client-side
  return (
    <div className="h-full w-full">
      <SignozClient />
    </div>
  )
}
