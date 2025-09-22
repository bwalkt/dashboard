import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppWithoutClerk from './AppWithoutClerk';
import MobileApp from './components/MobileApp';
import MobileAppWrapper from './MobileAppWrapper';
import SimpleMobileApp from './SimpleMobileApp';
import ErrorBoundary from './ErrorBoundary';

console.log('=== MAIN.TSX LOADING ===');

// Enhanced mobile detection that works without Tauri globals
function isMobileEnvironment() {
  const userAgent = navigator?.userAgent || '';
  const location = window?.location?.href || '';
  
  // Check if we're in a mobile environment
  const isMobileUA = /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent);
  const isTauriProtocol = location.startsWith('tauri://');
  const isTauriApp = typeof (window as any).__TAURI__ !== 'undefined';
  
  // For now, let's use the mobile app for ANY Tauri environment (mobile or desktop)
  // and also for actual mobile browsers
  const result = isMobileUA || isTauriProtocol || isTauriApp;
  
  console.log('Mobile detection:', {
    userAgent,
    location,
    isMobileUA,
    isTauriProtocol,
    isTauriApp,
    finalResult: result
  });
  
  return result;
}

// Error handlers
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  console.log('Root element found, mounting React app');
  try {
    // Use MobileApp for mobile environments, otherwise show a simple message
    const isMobile = isMobileEnvironment();
    console.log('Using mobile app:', isMobile);
    
    // Use the full dashboard for all environments (mobile and web)
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <AppWithoutClerk />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('✅ Full dashboard mounted successfully (without Clerk authentication)');
  } catch (error) {
    console.error('❌ Error mounting app:', error);
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px; font-family: sans-serif;">
        <h2>❌ App Mount Error</h2>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; white-space: pre-wrap;">
          ${error}
        </pre>
      </div>
    `;
  }
}
