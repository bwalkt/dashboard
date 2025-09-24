import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";

console.log("=== MAIN.TSX LOADING ===");

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
  console.log("Root element found, mounting React app");
  try {
    const root = ReactDOM.createRoot(rootElement);

    // Mount the main app
    console.log("🚀 Mounting app");
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log("✅ App mounted successfully");
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
