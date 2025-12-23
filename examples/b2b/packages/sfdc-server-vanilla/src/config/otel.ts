import FastifyOtelInstrumentation from '@fastify/otel'
import { trace } from '@opentelemetry/api'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

// Get configuration from environment variables
const serviceName = process.env.OTEL_SERVICE_NAME || 'sfdc-server-vanilla'
const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0'
// Default endpoint for self-hosted SigNoz OTLP collector (HTTP port)
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'
const tracesEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || `${otelEndpoint}/v1/traces`
const environment = process.env.NODE_ENV || 'development'

// Configure OTLP trace exporter for self-hosted SigNoz
const traceExporter = new OTLPTraceExporter({
  url: tracesEndpoint,
  headers: {},
})

// Create resource with service attributes
const resource = defaultResource().merge(
  resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': environment,
  }),
)

// Create Fastify OpenTelemetry instrumentation instance
const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
  // Use registerOnInitialization to integrate with NodeSDK
  registerOnInitialization: true,
  // Ignore OPTIONS requests (CORS preflight) to reduce noise in traces
  ignorePaths: opts => {
    return opts.method === 'OPTIONS'
  },
})

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        // Ignore OPTIONS requests (CORS preflight) at the HTTP level
        ignoreIncomingRequestHook: req => {
          // Filter out OPTIONS requests to reduce noise in traces
          return req.method === 'OPTIONS'
        },
      },
    }),
    // Add Fastify instrumentation to SDK's instrumentations
    fastifyOtelInstrumentation,
  ],
})

// Export function to start the SDK
export function startOpenTelemetry(): void {
  try {
    sdk.start()
    // No need to set tracer provider when using registerOnInitialization
    console.log(`✅ OpenTelemetry initialized for service: ${serviceName}`)
    console.log(`   Exporter endpoint: ${tracesEndpoint}`)
    console.log(`   Service version: ${serviceVersion}`)
    console.log(`   Environment: ${environment}`)
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry:', error)
    throw error
  }
}

// Export function to shutdown the SDK gracefully
export function shutdownOpenTelemetry(): Promise<void> {
  return sdk.shutdown()
}

// Export the Fastify instrumentation instance
export { fastifyOtelInstrumentation }
