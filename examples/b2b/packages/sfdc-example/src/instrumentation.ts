import * as Sentry from '@sentry/react'

const sentryOptions: Sentry.BrowserOptions = {
  // Sentry DSN
  dsn: import.meta.env.VITE_SENTRY_DSN,

  // Adds request headers and IP for users, for more info visit
  sendDefaultPii: true,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
}

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DISABLED) {
    Sentry.init(sentryOptions)
  }
}

export const captureException = Sentry.captureException
