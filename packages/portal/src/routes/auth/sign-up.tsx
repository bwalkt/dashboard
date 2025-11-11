import { createFileRoute } from '@tanstack/react-router'
import SignUp from '@/pages/auth/SignUp'

export const Route = createFileRoute('/auth/sign-up')({
  component: SignUp,
})