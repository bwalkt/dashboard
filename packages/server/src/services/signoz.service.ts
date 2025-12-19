/**
 * SigNoz API Service
 * Handles communication with the SigNoz query_range API endpoint
 */

import type {
  BuilderQuery,
  RawDataResponse,
  SelectField,
  SigNozFilters,
  SigNozPagination,
  SigNozQueryOptions,
  SigNozQueryPayload,
} from "@pzero/shared/types";
import { config } from "../config/env.js";

/**
 * Get the SigNoz API base URL from environment variables
 */
function getSigNozApiUrl(): string {
  const apiUrl = config.SIGNOZ_API_URL;
  if (!apiUrl) {
    throw new Error(
      "SIGNOZ_API_URL is not configured. Please set it in your .env file.",
    );
  }
  return apiUrl.replace(/\/$/, ""); // Remove trailing slash
}

/**
 * Get the SigNoz API key from environment variables
 */
function getSigNozApiKey(): string {
  const apiKey = config.SIGNOZ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SIGNOZ_API_KEY is not configured. Please set it in your .env file. You can generate an API key in SigNoz UI: Settings > API Keys",
    );
  }
  return apiKey;
}

/**
 * Escape single quotes in a string value for use in SigNoz filter expressions
 */
function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "\\'");
}

/**
 * Build filter expression from filters
 */
function buildFilterExpression(filters: SigNozFilters): string | undefined {
  const conditions: string[] = ['isRoot = true'];

  if (filters.serviceName) {
    const escapedServiceName = escapeSingleQuotes(filters.serviceName);
    conditions.push(`serviceName = '${escapedServiceName}'`);
  }

  if (filters.httpMethod) {
    const escapedHttpMethod = escapeSingleQuotes(filters.httpMethod);
    conditions.push(`http.method = '${escapedHttpMethod}'`);
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return conditions.join(" AND ");
}


/**
 * Build default select fields for traces
 */
function getDefaultTraceSelectFields(): SelectField[] {
  return [
    { name: "serviceName" },
    { name: "name" },
    { name: "durationNano" }, // Will be converted to durationMs in transformation
    { name: "responseStatusCode" },
    { name: "span_id" },
    { name: "trace_id" },
    { name: "timestamp" },
    { name: "http_method" },
    { name: "http_host" },
    { name: "http_url" },
    { name: "events" },
  ];
}

/**
 * Build SigNoz query payload for traces
 */
function buildTraceQueryPayload(
  filters: SigNozFilters,
  pagination: SigNozPagination,
): SigNozQueryPayload {
  const filterExpression = buildFilterExpression(filters);
  const selectFields = getDefaultTraceSelectFields();

  const builderQuery: BuilderQuery = {
    name: "A",
    signal: "traces",
    selectFields,
    limit: pagination.limit,
    offset: pagination.offset,
    order: [{
      "key": {
        "name": "timestamp"
    },
    "direction": "desc"
    }]
  };

  if (filterExpression) {
    builderQuery.filter = {
      expression: filterExpression,
    };
  }

  return {
    start: filters.startTime,
    end: filters.endTime,
    requestType: "raw",
    variables: {},
    compositeQuery: {
      queries: [
        {
          type: "builder_query",
          spec: builderQuery,
        },
      ],
    },
  };
}

/**
 * Calculates network timing phases from SigNoz API event strings.
 * Returns durations in milliseconds (ms).
 */
function calculateTimingPhases(eventStrings: string[]) {
  // 1. Parse the JSON strings into a usable Map
  const events = new Map<string, number>();
  
  eventStrings.forEach(str => {
    try {
      const parsed = JSON.parse(str);
      // Convert nanoseconds (BigInt) to milliseconds (Number)
      events.set(parsed.name, Number(parsed.timeUnixNano) / 1_000_000);
    } catch (e) {
      console.error("Failed to parse event string:", str);
    }
  });

  // Helper to get duration between two events
  const getDuration = (start: string, end: string) => {
    const s = events.get(start);
    const e = events.get(end);
    return (s !== undefined && e !== undefined) ? (e - s) : 0;
  };

  // 2. Calculate the specific phases
  return {
    'timing.dns': getDuration('domainLookupStart', 'domainLookupEnd'),
    'timing.connection': getDuration('connectStart', 'connectEnd'),
    // Note: If you have TLS events, use those. 
    // Otherwise, Connection usually includes TLS in these browser metrics.
    'timing.ttfb': getDuration('requestStart', 'responseStart'),
    'timing.transfer': getDuration('responseStart', 'responseEnd'),
  };
}

/**
 * Transform SigNoz API response to RawDataResponse format
 */
function transformSigNozResponse(
  apiResponse: any,
  pagination: SigNozPagination,
): RawDataResponse {
  // Extract rows from the nested response structure
  // Response structure: { status: "success", data: { data: { results: [{ rows: [...] }] } } }
  const results = apiResponse?.data?.data?.results || [];
  const rows = results[0]?.rows || [];
  
  // Extract the actual data from each row and transform durationNano to durationMs (milliseconds)
  const items = rows.map((row: any) => {
    const item = row.data || row;
    // Convert durationNano from nanoseconds to milliseconds and rename to durationMs
    if (item.durationNano !== undefined && item.durationNano !== null) {
      const { durationNano, ...rest } = item;
      const timingPhases = calculateTimingPhases(item.events);
      return {
        ...rest,
        durationMs: durationNano / 1000000, // Convert nanoseconds to milliseconds
        timingPhases,
      };
    }
    return item;
  });
  
  // Get total count from meta if available, otherwise use items length
  // Ensure the value is a number before returning it
  const metaTotal = apiResponse?.data?.meta?.total;
  const total = typeof metaTotal === 'number' ? metaTotal : items.length;
  
  return {
    data: items,
    total,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}

/**
 * Query SigNoz API for traces
 */
export async function queryTraces(
  options: SigNozQueryOptions,
): Promise<RawDataResponse> {
  const apiUrl = getSigNozApiUrl();
  const apiKey = getSigNozApiKey();
  const payload = buildTraceQueryPayload(options.filters, options.pagination);
  if(config.NODE_ENV === 'development') {
    console.log('queryTraces payload', JSON.stringify(payload, null, 2))
  }
  try {
    const response = await fetch(`${apiUrl}/api/v5/query_range`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "SIGNOZ-API-KEY": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `SigNoz API error: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    const apiResponse = await response.json();
    return transformSigNozResponse(apiResponse, options.pagination);
  } catch (error) {
    console.error("Error querying SigNoz traces API:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to query SigNoz traces API");
  }
}


