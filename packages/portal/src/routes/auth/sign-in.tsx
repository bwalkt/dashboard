import { createFileRoute } from '@tanstack/react-router'
import SignIn from '@/pages/auth/SignIn'

export const Route = createFileRoute('/auth/sign-in')({
  component: SignIn,
})
