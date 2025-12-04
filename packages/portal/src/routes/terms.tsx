import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
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
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1f2937' }}>Terms of Service</h1>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            Welcome to P-Zero Portal. By using our service, you agree to these terms.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            1. Acceptance of Terms
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            By accessing and using this service, you accept and agree to be bound by the terms and provision of this
            agreement.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            2. Privacy and Data Protection
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and
            protect your information.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            3. User Responsibilities
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            You are responsible for maintaining the confidentiality of your account and for all activities that occur
            under your account.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            4. Device Management
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            When connecting devices to our service, you agree to provide accurate device information. You may connect
            multiple devices to your account for synchronization purposes.
          </p>

          <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#374151' }}>
            5. Service Availability
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
            We strive to provide continuous service availability but do not guarantee uninterrupted access. We reserve
            the right to modify or discontinue the service with notice.
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
