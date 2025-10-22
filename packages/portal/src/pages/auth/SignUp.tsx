import { useEffect, useState } from 'react'
import SignUpViewPage from '@/features/auth/components/sign-up-view'

/**
 * Renders the sign-up page and supplies a GitHub repository star count to the view.
 *
 * Fetches the star count for `kiranism/next-shadcn-dashboard-starter` on mount and updates the value passed to the view; falls back to 3000 on error or if the count is unavailable.
 *
 * @returns The SignUpViewPage element with the current `stars` value passed as the `stars` prop.
 */
export default function SignUp() {
  const [stars, setStars] = useState(3000)

  useEffect(() => {
    fetch('https://api.github.com/repos/kiranism/next-shadcn-dashboard-starter')
      .then(response => response.json())
      .then(data => {
        if (data.stargazers_count) {
          setStars(data.stargazers_count)
        }
      })
      .catch(() => {
        // Error fetching GitHub stars, using default value
      })
  }, [])

  return <SignUpViewPage stars={stars} />
}
