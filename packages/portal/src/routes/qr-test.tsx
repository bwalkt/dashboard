import { createFileRoute } from '@tanstack/react-router'
import { QRTest } from '@/components/QRTest'

export const Route = createFileRoute('/qr-test')({
  component: QRTestPage,
})

function QRTestPage() {
  return <QRTest />
}
