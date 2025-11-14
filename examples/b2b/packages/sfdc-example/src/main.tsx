// Import tracing first to initialize OpenTelemetry instrumentation
import './tracing';

// Initialize USE_PROXY from localStorage before any API requests are made
import { initializeUseProxy } from './lib/proxy-config';
initializeUseProxy();

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";

// Environment detection removed - app now works universally

// Error handlers
window.addEventListener("error", (event) => {
  console.error("Global error caught:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);

    // Mount the main app
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("❌ Error mounting app:", error);
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
