/**
 * SigNoz API Service
 * Handles communication with the SigNoz query_range API endpoint
 */

import type { BuilderQuery, RawDataResponse, SelectField, SigNozFilters, SigNozPagination, SigNozQueryOptions, SigNozQueryPayload } from "@pzero/shared/types";
import { config } from "../config/env.js";

/**
 * Get the SigNoz API base URL from environment variables
 */
function getSigNozApiUrl(): string {
  const apiUrl = config.SIGNOZ_API_URL;
  if (!apiUrl) {
    throw new Error("SIGNOZ_API_URL is not configured. Please set it in your .env file.");
  }
  return apiUrl.replace(/\/$/, ""); // Remove trailing slash
}

/**
 * Get the SigNoz API key from environment variables
 */
function getSigNozApiKey(): string {
  const apiKey = config.SIGNOZ_API_KEY;
  if (!apiKey) {
    throw new Error("SIGNOZ_API_KEY is not configured. Please set it in your .env file. You can generate an API key in SigNoz UI: Settings > API Keys");
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
  const conditions: string[] = ["isRoot = true"];

  if (filters.serviceName) {
    const escapedServiceName = escapeSingleQuotes(filters.serviceName);
    conditions.push(`serviceName = '${escapedServiceName}'`);
  }

  if (filters.http_method) {
    const methods = Array.isArray(filters.http_method) ? filters.http_method : [filters.http_method];
    const escapedMethods = methods.map((method) => escapeSingleQuotes(method)).map((method) => `'${method}'`);
    conditions.push(`http_method IN [${escapedMethods.join(", ")}]`);
  } else {
    conditions.push(`http_method IN ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']`);
  }

  if (filters.http_host) {
    const escapedHttpHost = escapeSingleQuotes(filters.http_host);
    conditions.push(`http_host = '${escapedHttpHost}'`);
  }

  if (filters.http_url) {
    const escapedHttpUrl = escapeSingleQuotes(filters.http_url);
    conditions.push(`http_url = '${escapedHttpUrl}'`);
  }

  if (filters.responseStatusCode) {
    const statusCodes = Array.isArray(filters.responseStatusCode) ? filters.responseStatusCode : [filters.responseStatusCode];
    const escapedStatusCodes = statusCodes.map((code) => escapeSingleQuotes(code.toString())).map((code) => `'${code}'`);
    conditions.push(`responseStatusCode IN [${escapedStatusCodes.join(", ")}]`);
  }

  if (filters.durationMs !== undefined) {
    if (Array.isArray(filters.durationMs)) {
      // Range: [min, max] in milliseconds, convert to nanoseconds
      const [min, max] = filters.durationMs;
      const minNano = min * 1_000_000;
      const maxNano = max * 1_000_000;
      conditions.push(`durationNano >= ${minNano} AND durationNano <= ${maxNano}`);
    } else {
      // Single value: treat as maximum duration
      const maxNano = filters.durationMs * 1_000_000;
      conditions.push(`durationNano <= ${maxNano}`);
    }
  }

  if (filters.timingPhases) {
    const { dns, connection, tls, ttfb, transfer } = filters.timingPhases;

    // Note: Timing phases are calculated from events, so filtering might not be directly supported
    // These filters assume the timing values are stored as attributes in SigNoz
    // If not supported, these conditions will be ignored by the API

    if (dns !== undefined) {
      if (Array.isArray(dns)) {
        const [min, max] = dns;
        conditions.push(`timing.dns >= ${min} AND timing.dns <= ${max}`);
      } else {
        conditions.push(`timing.dns <= ${dns}`);
      }
    }

    if (connection !== undefined) {
      if (Array.isArray(connection)) {
        const [min, max] = connection;
        conditions.push(`timing.connection >= ${min} AND timing.connection <= ${max}`);
      } else {
        conditions.push(`timing.connection <= ${connection}`);
      }
    }

    if (tls !== undefined) {
      if (Array.isArray(tls)) {
        const [min, max] = tls;
        conditions.push(`timing.tls >= ${min} AND timing.tls <= ${max}`);
      } else {
        conditions.push(`timing.tls <= ${tls}`);
      }
    }

    if (ttfb !== undefined) {
      if (Array.isArray(ttfb)) {
        const [min, max] = ttfb;
        conditions.push(`timing.ttfb >= ${min} AND timing.ttfb <= ${max}`);
      } else {
        conditions.push(`timing.ttfb <= ${ttfb}`);
      }
    }

    if (transfer !== undefined) {
      if (Array.isArray(transfer)) {
        const [min, max] = transfer;
        conditions.push(`timing.transfer >= ${min} AND timing.transfer <= ${max}`);
      } else {
        conditions.push(`timing.transfer <= ${transfer}`);
      }
    }
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
    { name: "req_headers.x-challenge-answer" },
    { name: "req_headers.x-challenge-id" },
    { name: "res_headers.content-length" },
    { name: "res_headers.content-type" },
    { name: "res_headers.timing-allow-origin" },
  ];
}

/**
 * Build SigNoz query payload for traces
 */
function buildTraceQueryPayload(filters: SigNozFilters, pagination: SigNozPagination): SigNozQueryPayload {
  const filterExpression = buildFilterExpression(filters);
  const selectFields = getDefaultTraceSelectFields();

  const builderQuery: BuilderQuery = {
    name: "A",
    signal: "traces",
    selectFields,
    limit: pagination.limit,
    offset: pagination.offset,
    order: [
      {
        key: {
          name: "timestamp",
        },
        direction: "desc",
      },
    ],
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

type TimingPhases = {
  "timing.dns": number;
  "timing.connection": number;
  "timing.tls": number;
  "timing.ttfb": number;
  "timing.transfer": number;
  "timing.stalling": number;
};

type EventNames =
  | "fetchStart"
  | "domainLookupEnd"
  | "domainLookupStart"
  | "connectEnd"
  | "connectStart"
  | "secureConnectionStart"
  | "responseStart"
  | "requestStart"
  | "responseEnd";

/**
 * Calculates network timing phases from SigNoz API event strings.
 * Returns durations in milliseconds (ms).
 */
function getTimingObject(eventStrings: string[]): TimingPhases {
  const events: Record<EventNames, number> = {
    fetchStart: 0,
    domainLookupEnd: 0,
    domainLookupStart: 0,
    connectEnd: 0,
    connectStart: 0,
    secureConnectionStart: 0,
    responseStart: 0,
    requestStart: 0,
    responseEnd: 0,
  };

  // Parse strings and convert nanoseconds to milliseconds
  eventStrings.forEach((str) => {
    const parsed = JSON.parse(str) as { name: EventNames; timeUnixNano: string };
    events[parsed.name] = Number(parsed.timeUnixNano) / 1_000_000;
  });

  const tlsStart = events["secureConnectionStart"];
  const tlsDuration = tlsStart && tlsStart > 0 ? events["connectEnd"] - tlsStart : 0;

  let stalling = 0;
  if (events.domainLookupStart && events.fetchStart && events.requestStart && events.connectEnd) {
    stalling = events.domainLookupStart - events.fetchStart + (events.requestStart - events.connectEnd);
  }

  return {
    // 1. DNS: domainLookupEnd - domainLookupStart
    "timing.dns": events.domainLookupEnd - events.domainLookupStart,

    // 2. Connection: connectEnd - connectStart
    "timing.connection": events.connectEnd - events.connectStart,

    // 3. TLS: connectEnd - secureConnectionStart
    "timing.tls": tlsDuration,

    // 3. TTFB: responseStart - requestStart
    "timing.ttfb": events.responseStart - events.requestStart,

    // 4. Transfer: responseEnd - responseStart
    "timing.transfer": events.responseEnd - (events.responseStart || events.fetchStart),

    // Extra: Stalling (Internal browser/SDK overhead)
    // Use this to explain why the phases don't match the total latency
    "timing.stalling": stalling,
  };
}
/**
 * Transform SigNoz API response to RawDataResponse format
 */
function transformSigNozResponse(apiResponse: any, pagination: SigNozPagination): RawDataResponse {
  // Extract rows from the nested response structure
  // Response structure: { status: "success", data: { data: { results: [{ rows: [...] }] } } }
  const results = apiResponse?.data?.data?.results || [];
  const rows = results[0]?.rows || [];

  // Extract the actual data from each row and transform durationNano to durationMs (milliseconds)
  const items = rows.map((row: any) => {
    const item = row.data || row;

    // Extract request and response headers if they exist
    const requestHeaders: Record<string, string> = {};
    const responseHeaders: Record<string, string> = {};

    // Check and extract request headers (only if non-empty)
    if (
      item["req_headers.x-challenge-answer"] !== undefined &&
      item["req_headers.x-challenge-answer"] !== null &&
      item["req_headers.x-challenge-answer"] !== ""
    ) {
      requestHeaders["x-challenge-answer"] = item["req_headers.x-challenge-answer"];
    }
    if (item["req_headers.x-challenge-id"] !== undefined && item["req_headers.x-challenge-id"] !== null && item["req_headers.x-challenge-id"] !== "") {
      requestHeaders["x-challenge-id"] = item["req_headers.x-challenge-id"];
    }

    // Check and extract response headers (only if non-empty)
    if (item["res_headers.content-length"] !== undefined && item["res_headers.content-length"] !== null && item["res_headers.content-length"] !== "") {
      responseHeaders["content-length"] = item["res_headers.content-length"];
    }
    if (item["res_headers.content-type"] !== undefined && item["res_headers.content-type"] !== null && item["res_headers.content-type"] !== "") {
      responseHeaders["content-type"] = item["res_headers.content-type"];
    }
    if (
      item["res_headers.timing-allow-origin"] !== undefined &&
      item["res_headers.timing-allow-origin"] !== null &&
      item["res_headers.timing-allow-origin"] !== ""
    ) {
      responseHeaders["timing-allow-origin"] = item["res_headers.timing-allow-origin"];
    }

    // Remove header attributes and durationNano from item
    const {
      "req_headers.x-challenge-answer": _reqChallengeAnswer,
      "req_headers.x-challenge-id": _reqChallengeId,
      "res_headers.content-length": _resContentLength,
      "res_headers.content-type": _resContentType,
      "res_headers.timing-allow-origin": _resTimingAllowOrigin,
      durationNano,
      ...rest
    } = item;

    // Build result object
    const result: any = { ...rest };

    // Convert durationNano from nanoseconds to milliseconds and rename to durationMs
    if (durationNano !== undefined && durationNano !== null) {
      result.durationMs = durationNano / 1000000; // Convert nanoseconds to milliseconds
      result.timingPhases = getTimingObject(item.events);
    }

    // Add headers only if they have values
    if (Object.keys(requestHeaders).length > 0) {
      result.requestHeaders = requestHeaders;
    }
    if (Object.keys(responseHeaders).length > 0) {
      result.responseHeaders = responseHeaders;
    }

    return result;
  });

  // Get total count from meta if available, otherwise use items length
  // Ensure the value is a number before returning it
  const metaTotal = apiResponse?.data?.meta?.rowsScanned;
  const total = typeof metaTotal === "number" ? metaTotal : items.length;

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
export async function queryTraces(options: SigNozQueryOptions): Promise<RawDataResponse> {
  const apiUrl = getSigNozApiUrl();
  const apiKey = getSigNozApiKey();
  const payload = buildTraceQueryPayload(options.filters, options.pagination);
  if (config.NODE_ENV === "development") {
    console.log("queryTraces payload", JSON.stringify(payload, null, 2));
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

      throw new Error(`SigNoz API error: ${response.status} ${response.statusText}. ${errorText}`);
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
