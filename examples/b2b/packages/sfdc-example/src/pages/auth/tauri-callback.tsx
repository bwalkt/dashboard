import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const TauriCallbackPage = () => {

  const [hasRun, setHasRun] = useState(false)
  const [searchParams] = useSearchParams()
  useEffect(() => {
    if (!hasRun) {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      if (!code || !state) {
        throw new Error('Invalid auth state')
      }
      const redirectUrl = `salesforce-dashboard://auth/callback?state=${encodeURIComponent(state)}&code=${encodeURIComponent(code)}`
      window.location.href = redirectUrl
      setHasRun(true)
    }
  }, [hasRun])




  return (
    <div>Redirecting...</div>
  )
}

export default TauriCallbackPage