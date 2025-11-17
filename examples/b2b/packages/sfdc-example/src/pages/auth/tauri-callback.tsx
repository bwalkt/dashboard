import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

const TauriCallbackPage = () => {
  const [hasRun, setHasRun] = useState(false)
  const [searchParams] = useSearchParams()
  useEffect(() => {
    if (!hasRun) {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      if (!code || !state) {
        toast.error('Invalid auth state')
        return
      }
      const redirectUrl = `salesforce-dashboard://auth/callback?state=${encodeURIComponent(state)}&code=${encodeURIComponent(code)}`
      window.location.href = redirectUrl
      setHasRun(true)
    }
  }, [hasRun, searchParams])

  return <div>Redirecting...</div>
}

export default TauriCallbackPage
