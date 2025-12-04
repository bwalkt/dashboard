import { createFileRoute } from '@tanstack/react-router'

const ProfilePage = () => {
  return <div>Prof</div>
}

export const Route = createFileRoute('/dashboard/profile')({
  component: ProfilePage,
})
