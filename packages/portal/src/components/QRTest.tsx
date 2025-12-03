import * as QRCode from 'qrcode'
import { useState } from 'react'

export function QRTest() {
  const [qrCode, setQrCode] = useState<string>('')
  const [error, setError] = useState<string>('')

  const generateTestQR = async () => {
    try {
      setError('')
      const testData = {
        type: 'test',
        timestamp: Date.now(),
        message: 'Hello QR Code!',
      }

      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(testData), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })

      setQrCode(qrDataUrl)
    } catch (err) {
      setError(`QR Generation failed: ${err}`)
      console.error('QR Generation Error:', err)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#fff',
        gap: '20px',
        padding: '20px',
      }}
    >
      <h1>QR Code Test</h1>

      <button
        onClick={generateTestQR}
        style={{
          padding: '10px 20px',
          backgroundColor: '#80eeff',
          color: '#333',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Generate Test QR Code
      </button>

      {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}

      {qrCode && (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
          }}
        >
          <img src={qrCode} alt="Test QR Code" />
        </div>
      )}
    </div>
  )
}
