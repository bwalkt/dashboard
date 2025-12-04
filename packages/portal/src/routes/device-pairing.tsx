import { createFileRoute } from '@tanstack/react-router'
import { DevicePairingLanding } from '@/components/DevicePairingLanding'

export const Route = createFileRoute('/device-pairing')({
  component: DevicePairingPage,
})

function DevicePairingPage() {
  return <DevicePairingLanding />
}
