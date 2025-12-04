import { AlertCircle, CheckCircle, Loader2, RefreshCw, Smartphone } from 'lucide-react'
import * as QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import { type MobilePairingResponse, type PairingData, useDevicePairing } from '@/services/devicePairingService'
import { DevicesStore } from '@/stores/devices'
import { borderRadius, colors, getButtonStyles, getCardStyles, getGradientBackground, spacing } from '@/theme'

interface DevicePairingLandingProps {}

export function DevicePairingLanding({}: DevicePairingLandingProps) {
  const [step, setStep] = useState<'welcome' | 'qr' | 'connected' | 'error'>('welcome')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [connectionData, setConnectionData] = useState<PairingData | null>(null)
  const [connectedDevice, setConnectedDevice] = useState<MobilePairingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deviceNickname, setDeviceNickname] = useState<string>('')
  const [defaultNickname, setDefaultNickname] = useState<string>('')

  const devicePairing = useDevicePairing()
  const connectionPromiseRef = useRef<Promise<MobilePairingResponse> | null>(null)

  useEffect(() => {
    // Initialize devices store and generate default nickname
    const initializeComponent = async () => {
      await DevicesStore.init()

      // Generate default nickname
      await generateDefaultNickname()

      // Check if already connected to primary device
      await checkConnectionStatus()
    }

    initializeComponent()
  }, [])

  const generateDefaultNickname = async () => {
    try {
      // Get system info to generate default nickname
      const [platformValue, archValue] = await Promise.all([
        import('@tauri-apps/plugin-os').then(({ platform }) => platform()).catch(() => navigator.platform || 'web'),
        import('@tauri-apps/plugin-os').then(({ arch }) => arch()).catch(() => 'x64'),
      ])

      const screenInfo = { width: screen.width, height: screen.height }
      const screenSize = `${screenInfo.width}x${screenInfo.height}`
      const defaultNick = `${platformValue} ${archValue} ${screenSize}`

      setDefaultNickname(defaultNick)
      setDeviceNickname(defaultNick) // Pre-fill the input with default
    } catch (error) {
      console.error('Error generating default nickname:', error)
      setDefaultNickname('Unknown Device')
      setDeviceNickname('Unknown Device')
    }
  }

  const checkConnectionStatus = async () => {
    try {
      const status = await devicePairing.getConnectionStatus()

      if (status.isConnected) {
        setStep('connected')
        // Create mock response for connected device
        setConnectedDevice({
          type: 'mobile_pairing_response',
          connectionId: 'existing',
          mobileDeviceInfo: status.primaryDevice!,
          status: 'connected',
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
      setError('Failed to check connection status')
    }
  }

  const generateQRCode = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Generate pairing data with nickname
      const pairingData = await devicePairing.generatePairingData(deviceNickname.trim() || undefined)
      setConnectionData(pairingData)

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(pairingData), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })

      setQrCodeDataUrl(qrDataUrl)
      setStep('qr')

      // Start waiting for connection
      setIsWaiting(true)
      connectionPromiseRef.current = devicePairing.waitForConnection(pairingData.connectionId)

      try {
        const response = await connectionPromiseRef.current
        setConnectedDevice(response)
        setStep('connected')
      } catch (connectionError) {
        console.error('Connection failed:', connectionError)
        setError('Connection timed out. Please try again.')
        setStep('error')
      } finally {
        setIsWaiting(false)
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : typeof error,
      })
      setError(`Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`)
      setStep('error')
    } finally {
      setIsGenerating(false)
    }
  }

  const resetToWelcome = async () => {
    setStep('welcome')
    setQrCodeDataUrl('')
    setConnectionData(null)
    setConnectedDevice(null)
    setError(null)
    setIsWaiting(false)

    // Cancel any pending connection promise
    if (connectionPromiseRef.current) {
      connectionPromiseRef.current = null
    }
  }

  const disconnectDevice = async () => {
    try {
      await devicePairing.disconnect()
      resetToWelcome()
    } catch (error) {
      console.error('Error disconnecting device:', error)
      setError('Failed to disconnect device')
    }
  }

  const WelcomeScreen = () => (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...getGradientBackground('primary'),
        padding: spacing.lg,
      }}
    >
      <div
        style={{
          ...getCardStyles(),
          width: '100%',
          maxWidth: '28rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: spacing.xxxl,
            gap: spacing.xxl,
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: '6rem',
              height: '6rem',
              position: 'relative',
            }}
          >
            <img
              src="/logo.png"
              alt="P-Zero Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              onError={e => {
                // Fallback to a simple colored square if logo doesn't load
                const target = e.currentTarget
                target.style.display = 'none'
                if (!target.parentElement?.querySelector('.fallback-logo')) {
                  const fallback = document.createElement('div')
                  fallback.className = 'fallback-logo'
                  Object.assign(fallback.style, {
                    width: '6rem',
                    height: '6rem',
                    backgroundColor: colors.primaryColor,
                    borderRadius: borderRadius.lg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.buttonTextColor,
                    fontWeight: 'bold',
                    fontSize: '1.5rem',
                  })
                  fallback.textContent = 'PZ'
                  target.parentElement?.appendChild(fallback)
                }
              }}
            />
          </div>

          {/* Welcome Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.textLightColor,
                margin: 0,
              }}
            >
              Welcome to P-Zero Portal
            </h1>
            <p
              style={{
                color: colors.textDarkColor,
                margin: 0,
              }}
            >
              Connect with your mobile device to sync and manage your data securely.
            </p>
          </div>

          {/* Continue Button */}
          <button
            onClick={generateQRCode}
            disabled={isGenerating}
            style={{
              ...getButtonStyles('primary', 'large'),
              width: '100%',
              fontSize: '1.125rem',
              opacity: isGenerating ? 0.6 : 1,
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 style={{ marginRight: spacing.sm, width: '1rem', height: '1rem' }} className="animate-spin" />
                Generating...
              </>
            ) : (
              'Continue'
            )}
          </button>

          {/* Footer */}
          <p
            style={{
              fontSize: '0.875rem',
              color: colors.textDarkColor,
              margin: 0,
            }}
          >
            Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )

  const QRCodeScreen = () => (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...getGradientBackground('primary'),
        padding: spacing.lg,
      }}
    >
      <div
        style={{
          ...getCardStyles(),
          width: '100%',
          maxWidth: '28rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: spacing.xxxl,
            gap: spacing.xxl,
          }}
        >
          {/* Nickname Input */}
          <div
            style={{
              width: '100%',
              textAlign: 'left',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: colors.textLightColor,
                marginBottom: spacing.xs,
              }}
            >
              Device Nickname (Optional)
            </label>
            <input
              type="text"
              value={deviceNickname}
              onChange={e => setDeviceNickname(e.target.value)}
              placeholder={defaultNickname || 'Enter a nickname for this device'}
              style={{
                width: '100%',
                padding: `${spacing.sm} ${spacing.md}`,
                fontSize: '1rem',
                border: `1px solid ${colors.borderColor}`,
                borderRadius: borderRadius.md,
                backgroundColor: colors.cardBackgroundColor,
                color: colors.textLightColor,
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.target.style.borderColor = colors.primaryColor
              }}
              onBlur={e => {
                e.target.style.borderColor = colors.borderColor
              }}
            />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <Smartphone style={{ width: '3rem', height: '3rem', color: colors.primaryColor, margin: '0 auto' }} />
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.textLightColor,
                margin: 0,
              }}
            >
              Scan QR Code
            </h1>
            <p
              style={{
                color: colors.textDarkColor,
                margin: 0,
              }}
            >
              Open your mobile app and scan this code to connect your devices.
            </p>
          </div>

          {/* QR Code */}
          {qrCodeDataUrl && (
            <div
              style={{
                padding: spacing.lg,
                backgroundColor: colors.white,
                borderRadius: borderRadius.lg,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <img
                src={qrCodeDataUrl}
                alt="QR Code for device pairing"
                style={{
                  width: '16rem',
                  height: '16rem',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
            </div>
          )}

          {/* Instructions */}
          <div
            style={{
              fontSize: '0.875rem',
              color: colors.textDarkColor,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.xs,
            }}
          >
            <p style={{ margin: 0 }}>1. Open the mobile app</p>
            <p style={{ margin: 0 }}>2. Tap "Scan QR Code" or "Connect Device"</p>
            <p style={{ margin: 0 }}>3. Point your camera at this code</p>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: spacing.md,
              width: '100%',
            }}
          >
            <button
              onClick={resetToWelcome}
              style={{
                ...getButtonStyles('outline'),
                flex: 1,
              }}
            >
              Back
            </button>
            <button
              onClick={generateQRCode}
              style={{
                ...getButtonStyles('outline'),
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
              }}
            >
              <RefreshCw style={{ width: '1rem', height: '1rem' }} />
              Refresh
            </button>
          </div>

          {/* Loading indicator */}
          {isWaiting && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.875rem',
                color: colors.textDarkColor,
                gap: spacing.sm,
              }}
            >
              <Loader2 style={{ width: '1rem', height: '1rem' }} className="animate-spin" />
              Waiting for mobile device...
            </div>
          )}

          {/* Connection timeout warning */}
          {!isWaiting && step === 'qr' && (
            <div
              style={{
                fontSize: '0.75rem',
                color: colors.textDarkColor,
                textAlign: 'center',
                opacity: 0.7,
              }}
            >
              QR code will expire in 5 minutes
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const ConnectedScreen = () => (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...getGradientBackground('primary'),
        padding: spacing.lg,
      }}
    >
      <div
        style={{
          ...getCardStyles(),
          width: '100%',
          maxWidth: '28rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: spacing.xxxl,
            gap: spacing.xxl,
          }}
        >
          {/* Success Icon */}
          <CheckCircle style={{ width: '4rem', height: '4rem', color: colors.primaryColor }} />

          {/* Success Message */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.textLightColor,
                margin: 0,
              }}
            >
              Connected Successfully!
            </h1>
            <p
              style={{
                color: colors.textDarkColor,
                margin: 0,
              }}
            >
              Your mobile device is now connected. You can start syncing your data.
            </p>
          </div>

          {/* Device Info */}
          {connectedDevice && (
            <div
              style={{
                width: '100%',
                padding: spacing.lg,
                backgroundColor: colors.cardBackgroundColor,
                borderRadius: borderRadius.lg,
                textAlign: 'left',
              }}
            >
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: colors.textLightColor,
                  marginBottom: spacing.sm,
                  margin: 0,
                }}
              >
                Connected Device:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: colors.textDarkColor,
                    margin: 0,
                  }}
                >
                  <strong>Name:</strong> {connectedDevice.mobileDeviceInfo.deviceName}
                </p>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: colors.textDarkColor,
                    margin: 0,
                  }}
                >
                  <strong>System:</strong> {connectedDevice.mobileDeviceInfo.systemName}{' '}
                  {connectedDevice.mobileDeviceInfo.systemVersion}
                </p>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: colors.textDarkColor,
                    margin: 0,
                  }}
                >
                  <strong>Connected:</strong> {new Date(connectedDevice.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={() => {
              // Navigate to main app
              window.location.href = '/dashboard'
            }}
            style={{
              ...getButtonStyles('primary', 'large'),
              width: '100%',
              fontSize: '1.125rem',
            }}
          >
            Continue to Dashboard
          </button>

          {/* Disconnect option */}
          <button
            onClick={disconnectDevice}
            style={{
              ...getButtonStyles('ghost'),
              fontSize: '0.875rem',
            }}
          >
            Disconnect and start over
          </button>
        </div>
      </div>
    </div>
  )

  const ErrorScreen = () => (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...getGradientBackground('primary'),
        padding: spacing.lg,
      }}
    >
      <div
        style={{
          ...getCardStyles(),
          width: '100%',
          maxWidth: '28rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: spacing.xxxl,
            gap: spacing.xxl,
          }}
        >
          {/* Error Icon */}
          <AlertCircle style={{ width: '4rem', height: '4rem', color: colors.errorColor }} />

          {/* Error Message */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.textLightColor,
                margin: 0,
              }}
            >
              Connection Failed
            </h1>
            <p
              style={{
                color: colors.textDarkColor,
                margin: 0,
              }}
            >
              {error || 'An unexpected error occurred while trying to connect.'}
            </p>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: spacing.md,
              width: '100%',
            }}
          >
            <button
              onClick={resetToWelcome}
              style={{
                ...getButtonStyles('outline'),
                flex: 1,
              }}
            >
              Try Again
            </button>
            <button
              onClick={generateQRCode}
              disabled={isGenerating}
              style={{
                ...getButtonStyles('primary'),
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                opacity: isGenerating ? 0.6 : 1,
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 style={{ width: '1rem', height: '1rem' }} className="animate-spin" />
                  Generating...
                </>
              ) : (
                'Retry QR Code'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Render appropriate screen based on current step
  switch (step) {
    case 'welcome':
      return <WelcomeScreen />
    case 'qr':
      return <QRCodeScreen />
    case 'connected':
      return <ConnectedScreen />
    case 'error':
      return <ErrorScreen />
    default:
      return <WelcomeScreen />
  }
}
