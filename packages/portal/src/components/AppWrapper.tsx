import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDevicePairing } from '@/services/devicePairingService'
import { useDevicesStore } from '@/stores/devices'
import { DevicePairingLanding } from './DevicePairingLanding'

interface AppWrapperProps {
  children: React.ReactNode
}

export function AppWrapper({ children }: AppWrapperProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [needsPairing, setNeedsPairing] = useState(false)
  const devicesStore = useDevicesStore()
  const devicePairing = useDevicePairing()

  // Routes that should bypass the pairing check - use window.location to avoid router dependency
  const publicRoutes = ['/terms', '/privacy']
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
  const isPublicRoute = publicRoutes.includes(currentPath)

  useEffect(() => {
    checkDeviceStatus()
  }, [])

  const checkDeviceStatus = async () => {
    try {
      // Initialize devices store
      await devicesStore.init()

      // Check connection status
      const status = await devicePairing.getConnectionStatus()

      // If not connected to a primary device, show pairing screen
      setNeedsPairing(!status.isConnected)
    } catch (error) {
      console.error('Error checking device status:', error)
      // If there's an error, assume pairing is needed
      setNeedsPairing(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Checking device status...</p>
        </div>
      </div>
    )
  }

  // Allow public routes to bypass pairing check
  if (isPublicRoute) {
    console.log('AppWrapper: Allowing public route:', currentPath)
    return <>{children}</>
  }

  if (needsPairing) {
    return <DevicePairingLanding />
  }

  return <>{children}</>
}
