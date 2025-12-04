import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/test-page')({
  component: TestPage,
})

function TestPage() {
  // Add more aggressive debugging
  console.log('=== TestPage rendering START ===')
  console.log('Window location:', window.location.href)
  console.log('Document readyState:', document.readyState)

  // Set a timeout to check if the component stays rendered
  setTimeout(() => {
    console.log('TestPage still here after 1 second')
  }, 1000)

  setTimeout(() => {
    console.log('TestPage still here after 3 seconds')
  }, 3000)

  // Add error boundary simulation
  try {
    console.log('=== TestPage rendering END ===')

    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '2rem',
          backgroundColor: '#ff0000',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '24px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
        onClick={() => console.log('Page clicked')}
      >
        <h1>TEST PAGE WORKS!</h1>
        <p>URL: {window.location.href}</p>
        <p>Time: {new Date().toISOString()}</p>
        <p>If you can see this red page, the routing is working.</p>
        <button
          onClick={e => {
            e.preventDefault()
            console.log('Back button clicked')
            window.history.back()
          }}
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            marginTop: '1rem',
          }}
        >
          GO BACK
        </button>
      </div>
    )
  } catch (error) {
    console.error('TestPage render error:', error)
    return (
      <div style={{ backgroundColor: '#ff0000', minHeight: '100vh', color: '#fff', padding: '2rem' }}>
        ERROR: {String(error)}
      </div>
    )
  }
}
