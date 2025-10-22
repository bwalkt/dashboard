// This file configures the initialization of Sentry for the React app.
// This replaces the Next.js specific Sentry client configuration.
// https://docs.sentry.io/platforms/javascript/guides/react/
import * as Sentry from '@sentry/react'

if (!import.meta.env.VITE_SENTRY_DISABLED) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    // Add optional integrations for additional features
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],

    // Adds request headers and IP for users, for more info visit
    sendDefaultPii: true,

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  })
}
