import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1.6',
        color: '#333',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        {/* Back Button */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f5f5f5'
              e.currentTarget.style.borderColor = '#999'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = '#ddd'
            }}
          >
            ← Back
          </button>
        </div>

        {/* Content */}
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1f2937' }}>Privacy Policy</h1>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            Your privacy is important to us. This policy explains how we collect, use, and protect your personal
            information.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            1. Information We Collect
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            We collect information you provide directly to us, such as when you create an account, use our services, or
            contact us for support. This includes device information necessary for synchronization and service
            functionality.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            2. How We Use Your Information
          </h2>
          <ul style={{ marginBottom: '1.5rem', color: '#4b5563', paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>To provide and maintain our services</li>
            <li style={{ marginBottom: '0.5rem' }}>To synchronize data across your connected devices</li>
            <li style={{ marginBottom: '0.5rem' }}>To notify you about changes to our service</li>
            <li style={{ marginBottom: '0.5rem' }}>To provide customer support</li>
            <li style={{ marginBottom: '0.5rem' }}>To detect, prevent and address technical issues</li>
          </ul>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            3. Data Security
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            We implement appropriate security measures to protect your personal information against unauthorized access,
            alteration, disclosure, or destruction. All data transmission between your devices is encrypted.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            4. Device Information
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            When you connect devices to our service, we collect device information such as device type, operating
            system, hardware specifications, and unique identifiers to provide optimal service functionality and enable
            device pairing.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            5. Data Retention
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            We retain your information only for as long as necessary to provide our services or as required by law. You
            may request deletion of your data at any time.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            6. Contact Us
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            If you have any questions about this Privacy Policy or our data practices, please contact us through our
            support channels.
          </p>

          <div
            style={{
              marginTop: '3rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#666',
            }}
          >
            Last updated: {new Date().toLocaleDateString()}
          </div>

          <div
            style={{
              marginTop: '2rem',
              textAlign: 'center',
            }}
          >
            <button
              onClick={() => window.history.back()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#2563eb'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#3b82f6'
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
