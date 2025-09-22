import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppWithoutClerk from './AppWithoutClerk';
import MobileApp from './components/MobileApp';
import MobileAppWrapper from './MobileAppWrapper';
import SimpleMobileApp from './SimpleMobileApp';
import ErrorBoundary from './ErrorBoundary';

console.log('=== MAIN.TSX LOADING ===');

// Enhanced environment detection
function getEnvironmentType() {
  const userAgent = navigator?.userAgent || '';
  const location = window?.location?.href || '';
  
  // Check if we're in Tauri (mobile or desktop)
  const isTauriProtocol = location.startsWith('tauri://');
  const isTauriApp = typeof (window as any).__TAURI__ !== 'undefined';
  
  // Check if it's a mobile browser
  const isMobileUA = /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent);
  
  let envType: 'tauri-mobile' | 'tauri-desktop' | 'web-browser' = 'web-browser';
  
  if (isTauriProtocol || isTauriApp) {
    // It's a Tauri app - check if mobile or desktop
    envType = isMobileUA ? 'tauri-mobile' : 'tauri-desktop';
  } else {
    // It's a regular web browser
    envType = 'web-browser';
  }
  
  console.log('Environment detection:', {
    userAgent,
    location,
    isTauriProtocol,
    isTauriApp,
    isMobileUA,
    envType
  });
  
  return envType;
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
    const envType = getEnvironmentType();
    const root = ReactDOM.createRoot(rootElement);
    
    if (envType === 'web-browser') {
      // For web browsers, use the full App with Clerk authentication
      console.log('🌐 Web browser detected - mounting App with Clerk authentication');
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </React.StrictMode>
      );
      console.log('✅ Web app with authentication mounted successfully');
    } else {
      // For Tauri (mobile or desktop), use the app without Clerk
      console.log('📱 Tauri environment detected - mounting App without Clerk');
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <AppWithoutClerk />
          </ErrorBoundary>
        </React.StrictMode>
      );
      console.log('✅ Tauri app without authentication mounted successfully');
    }
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
