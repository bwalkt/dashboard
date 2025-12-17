import SignUpViewPage from '@/features/auth/components/sign-up-view'

/**
 * Renders the sign-up page and supplies a GitHub repository star count to the view.
 *
 * @returns The SignUpViewPage element with the current `stars` value passed as the `stars` prop.
 */
export default function SignUp() {
  return <SignUpViewPage />
}
