import { ZoneContextManager } from '@opentelemetry/context-zone'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'

// Get backend URL from environment for trace header propagation
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
const proxyUrl = import.meta.env.VITE_PROXY_URL
const useProxy = import.meta.env.VITE_USE_PROXY

// Build list of URLs to propagate trace headers to
// Escape special regex characters in URLs and create regex patterns that match subpaths
const escapeRegex = (url: string) => url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Match the base URL and any subpaths (e.g., http://localhost:3000 matches http://localhost:3000/api/*)
const corsUrls: (string | RegExp)[] = [new RegExp(`^${escapeRegex(backendUrl)}`)]
if (useProxy === 'true' && proxyUrl) {
  corsUrls.push(new RegExp(`^${escapeRegex(proxyUrl)}`))
}

// Define resource and service attributes
const resource = defaultResource().merge(
  resourceFromAttributes({
    'service.name': 'sfdc-example',
    'service.version': '1.0.0',
  }),
)

// Set up the OTLP trace exporter pointing to self-hosted SigNoz OTEL Collector
// The OTEL Collector is configured to receive traces on HTTP endpoint 4318
// Get exporter URL from environment variable, default to localhost for self-hosted SigNoz
const otelExporterUrl = import.meta.env.VITE_OTEL_EXPORTER_URL || 'http://localhost:4318/v1/traces'
const exporter = new OTLPTraceExporter({
  url: otelExporterUrl,
  // Add headers if needed (usually not required for self-hosted)
  headers: {},
})

// Log tracing initialization for debugging
console.log('[OpenTelemetry] Initializing tracing...', {
  exporterUrl: otelExporterUrl,
  serviceName: 'sfdc-example',
  corsUrls: corsUrls.map(url => url.toString()),
})

// Set up the span processor
const processor = new BatchSpanProcessor(exporter)

// Create and configure the WebTracerProvider
const provider = new WebTracerProvider({
  resource: resource,
  spanProcessors: [processor], // Add the span processor here,
})

// Register the tracer provider with the context manager
provider.register({
  contextManager: new ZoneContextManager(),
})

// Log successful initialization
console.log('[OpenTelemetry] Tracing initialized successfully')

// Sensitive headers that should be masked or omitted
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'api-key',
  'x-api-key',
  'x-authorization',
  'x-session',
  'token',
  'access-token',
])

// Normalize header name to lowercase
const normalizeHeaderName = (name: string): string => name.toLowerCase()

// Mask sensitive header value (show first 4 chars + "***")
const maskSensitiveValue = (value: string): string => {
  if (value.length <= 4) return '***'
  return value.slice(0, 4) + '***'
}

// Process headers and set attributes with filtering and masking
const processHeaders = (span: any, headers: Headers | HeadersInit, prefix: 'req_headers' | 'res_headers'): void => {
  // Convert HeadersInit to Headers for consistent handling
  const headersObj = headers instanceof Headers ? headers : new Headers(headers)
  const entries = Array.from(headersObj.entries())

  for (const [key, value] of entries) {
    const normalizedKey = normalizeHeaderName(key)
    const stringValue = typeof value === 'string' ? value : String(value)

    // Mask sensitive headers instead of omitting completely
    if (SENSITIVE_HEADERS.has(normalizedKey)) {
      span.setAttribute(`${prefix}.${normalizedKey}`, maskSensitiveValue(stringValue))
    } else {
      span.setAttribute(`${prefix}.${normalizedKey}`, stringValue)
    }
  }
}

// Set up automatic instrumentation for web APIs
registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      // Only propagate trace headers to configured backend/proxy URLs
      propagateTraceHeaderCorsUrls: corsUrls,
      ignoreUrls: [otelExporterUrl],
      applyCustomAttributesOnSpan: (span, request, response) => {
        // Process request headers
        if (request.headers) {
          processHeaders(span, request.headers, 'req_headers')
        }

        // Process response headers
        if (response instanceof Response && response.headers) {
          processHeaders(span, response.headers, 'res_headers')
        }

        return span
      },
    }),
  ],
})
