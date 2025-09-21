import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import MobileApp from './components/MobileApp';
import MinimalMobileApp from './components/MinimalMobileApp';
import ErrorBoundary from './ErrorBoundary';
import { isMobile, isTauri } from './lib/platform';
// import TestApp from './TestApp'

// Only import CSS for non-Tauri environments to avoid potential mobile issues
if (!isTauri()) {
  import('./styles/globals.css');
  import('./styles/theme.css');
}

console.log('Main.tsx loading, attempting to mount React app');
console.log('Platform detection - isTauri:', isTauri(), 'isMobile:', isMobile());
console.log('Window object available:', typeof window !== 'undefined');
console.log('Document available:', typeof document !== 'undefined');

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: sans-serif;">Root element not found!</div>';
} else {
  console.log('Root element found, mounting React app');
  try {
    // Use minimal mobile app for Tauri platforms
    const AppComponent = isTauri() ? MinimalMobileApp : App;
    console.log('Using app component:', isTauri() ? 'MinimalMobileApp' : 'FullApp');
    
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <AppComponent />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('React app mounted successfully');
  } catch (error) {
    console.error('Error mounting React app:', error);
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px; font-family: sans-serif;">
        <h2>Error mounting app</h2>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">
          ${error}
        </pre>
        <p>Check console for more details.</p>
      </div>
    `;
  }
}
