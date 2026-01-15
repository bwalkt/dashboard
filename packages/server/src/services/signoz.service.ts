/**
 * SigNoz API Service
 * Handles communication with the SigNoz query_range API endpoint
 */

import { CHALLENGE_ANSWER_HEADER, CHALLENGE_ID_HEADER } from "@pzero/shared/challenge";
import { CHALLENGE_HEADER, CHALLENGE_PARAMS_HEADER, extractHeaders } from "@pzero/shared/http";
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
 * Escape LIKE wildcards (%, _, \) to match them literally
 */
function escapeLikeWildcards(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
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

  if (filters.httpMethod) {
    const methods = Array.isArray(filters.httpMethod) ? filters.httpMethod : [filters.httpMethod];
    const escapedMethods = methods.map((method) => escapeSingleQuotes(method)).map((method) => `'${method}'`);
    conditions.push(`http_method IN [${escapedMethods.join(", ")}]`);
  } else {
    conditions.push(`http_method IN ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']`);
  }

  if (filters.http_host) {
    const escapedHttpHost = escapeSingleQuotes(escapeLikeWildcards(filters.http_host));
    conditions.push(`http_host LIKE '%${escapedHttpHost}%'`);
  }

  if (filters.http_url) {
    const escapedHttpUrl = escapeSingleQuotes(escapeLikeWildcards(filters.http_url));
    conditions.push(`http_url LIKE '%${escapedHttpUrl}%'`);
  }

  if (filters.responseStatusCode) {
    const statusCodes = Array.isArray(filters.responseStatusCode) ? filters.responseStatusCode : [filters.responseStatusCode];
    // Status codes are numbers in SigNoz, don't wrap in quotes
    const numericStatusCodes = statusCodes
      .map((code) => parseInt(code.toString(), 10))
      .filter((code) => !isNaN(code));
    if (numericStatusCodes.length > 0) {
      conditions.push(`responseStatusCode IN [${numericStatusCodes.join(", ")}]`);
    }
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
    { name: `req_headers.${CHALLENGE_ANSWER_HEADER}` },
    { name: `req_headers.${CHALLENGE_ID_HEADER}` },
    { name: `res_headers.${CHALLENGE_ID_HEADER}` },
    { name: `res_headers.${CHALLENGE_PARAMS_HEADER}` },
    { name: `res_headers.${CHALLENGE_HEADER}` },
    { name: "res_headers.content-length" },
    { name: "res_headers.content-type" },
    { name: "res_headers.timing-allow-origin" },
    { name: "res_headers.server-timing" },
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
  "timing.envoy_total"?: number;
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
 * Parse Server-Timing header value
 * Format: "envoy-total;dur=20"
 * Returns object with envoy_total duration in milliseconds
 */
function parseServerTiming(serverTimingHeader: string | undefined | null): {
  envoy_total?: number;
} {
  if (!serverTimingHeader) {
    return {};
  }

  const result: { envoy_total?: number } = {};

  // Split by comma to get individual entries
  const entries = serverTimingHeader.split(",").map((entry) => entry.trim());

  entries.forEach((entry) => {
    // Parse format: "name;dur=value"
    const parts = entry.split(";");
    if (parts.length >= 2 && parts[0]) {
      const name = parts[0].trim();
      const durPart = parts.find((p) => p.trim().startsWith("dur="));
      if (durPart) {
        const duration = parseFloat(durPart.split("=")[1]?.trim() || "0");
        if (!isNaN(duration) && name === "envoy-total") {
          result.envoy_total = duration;
        }
      }
    }
  });

  return result;
}

/**
 * Calculates network timing phases from SigNoz API event strings and Server-Timing header.
 * Returns durations in milliseconds (ms).
 */
function getTimingObject(eventStrings: string[], serverTimingHeader?: string | null): TimingPhases {
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
    try {
      const parsed = JSON.parse(str) as { name: EventNames; timeUnixNano: string };
      events[parsed.name] = Number(parsed.timeUnixNano) / 1_000_000;
    } catch (error) {
      console.error("Failed to parse event string:", str, error);
      // Skip this event and continue processing other events
    }
  });

  const tlsStart = events["secureConnectionStart"];
  const tlsDuration = tlsStart && tlsStart > 0 ? events["connectEnd"] - tlsStart : 0;

  let stalling = 0;
  if (events.domainLookupStart && events.fetchStart && events.requestStart && events.connectEnd) {
    stalling = events.domainLookupStart - events.fetchStart + (events.requestStart - events.connectEnd);
  }

  // Parse Server-Timing header if provided
  const serverTiming = parseServerTiming(serverTimingHeader);

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

    // Server-Timing header value (from Envoy)
    ...(serverTiming.envoy_total !== undefined && {
      "timing.envoy_total": serverTiming.envoy_total,
    }),
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
    const requestHeaders: Record<string, string> = extractHeaders(item, [CHALLENGE_ANSWER_HEADER, CHALLENGE_ID_HEADER], "req_headers");
    const responseHeaders: Record<string, string> = extractHeaders(
      item,
      [
        "content-length",
        "content-type",
        "timing-allow-origin",
        "server-timing",
        CHALLENGE_HEADER,
        CHALLENGE_PARAMS_HEADER,
        CHALLENGE_ID_HEADER,
        CHALLENGE_ANSWER_HEADER,
      ],
      "res_headers"
    );

    // Remove header attributes and durationNano from item
    const {
      [`req_headers.${CHALLENGE_ANSWER_HEADER}`]: _reqChallengeAnswer,
      [`req_headers.${CHALLENGE_ID_HEADER}`]: _reqChallengeId,
      [`res_headers.${CHALLENGE_ID_HEADER}`]: _resChallengeId,
      [`res_headers.${CHALLENGE_ANSWER_HEADER}`]: _resChallengeAnswer,
      [`res_headers.${CHALLENGE_HEADER}`]: _resChallenge,
      [`res_headers.${CHALLENGE_PARAMS_HEADER}`]: _resChallengeParams,
      "res_headers.content-length": _resContentLength,
      "res_headers.content-type": _resContentType,
      "res_headers.timing-allow-origin": _resTimingAllowOrigin,
      "res_headers.server-timing": serverTimingHeader,
      durationNano,
      ...rest
    } = item;

    // Build result object
    const result: any = { ...rest };

    // Convert durationNano from nanoseconds to milliseconds and rename to durationMs
    if (durationNano !== undefined && durationNano !== null) {
      result.durationMs = durationNano / 1000000; // Convert nanoseconds to milliseconds
      result.timingPhases = getTimingObject(item.events || [], serverTimingHeader);
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
