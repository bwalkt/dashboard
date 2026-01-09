import { createValidator } from "@pzero/shared/validator/ajv";
import { LEVELS } from "@/constants/levels";
import { METHODS } from "@/constants/method";
import { REGIONS } from "@/constants/region";
import { ARRAY_DELIMITER, RANGE_DELIMITER, SLIDER_DELIMITER } from "@/lib/delimiters";

// =============================================================================
// TypeScript Interfaces
// =============================================================================

export interface TimingSchema {
  "timing.dns": number;
  "timing.connection": number;
  "timing.tls": number;
  "timing.ttfb": number;
  "timing.transfer": number;
}

export interface ColumnSchema extends TimingSchema {
  uuid: string;
  method: (typeof METHODS)[number];
  host: string;
  pathname: string;
  level: (typeof LEVELS)[number];
  latency: number;
  status: number;
  regions: (typeof REGIONS)[number][];
  date: Date;
  headers: Record<string, string>;
  message?: string;
  percentile?: number;
}

export interface ColumnFilterSchema {
  level?: (typeof LEVELS)[number][];
  method?: (typeof METHODS)[number][];
  host?: string;
  pathname?: string;
  latency?: number[];
  "timing.dns"?: number[];
  "timing.connection"?: number[];
  "timing.tls"?: number[];
  "timing.ttfb"?: number[];
  "timing.transfer"?: number[];
  status?: number[];
  regions?: (typeof REGIONS)[number][];
  date?: Date[];
}

export interface FacetMetadataSchema {
  rows: Array<{ value: any; total: number }>;
  total: number;
  min?: number;
  max?: number;
}

import type { BaseChartSchema } from "@/components/infinite-data-table/types";
import { TimingPhase } from "@/lib/request/timing";

export interface TimelineChartSchema extends BaseChartSchema {
  timestamp: number;
  [K in typeof LEVELS[number]]: number;
}

// =============================================================================
// SigNoz Trace Schema
// =============================================================================

export interface SignozTraceSchema {
  trace_id: string;
  span_id: string;
  serviceName: string;
  name: string; // span name/operation
  durationMs: number;
  responseStatusCode?: number | string; // Can be string from API, converted to number in transform
  timestamp: number; // epoch milliseconds
  date: Date; // converted from timestamp for table display
  http_method?: string;
  http_host?: string;
  http_url?: string;
  timingPhases: Record<TimingPhase, number>;
  responseHeaders?: Record<string, string>;
  requestHeaders?: Record<string, string>;
}

export interface SignozColumnFilterSchema {
  trace_id: string;
  span_id: string;
  serviceName: string;
  name: string; // span name/operation
  durationMs: number;
  date: Date; // converted from timestamp for table display
  responseStatusCode?: number | string; // Can be string from API, converted to number in transform
  timestamp: number; // epoch milliseconds
  http_method?: string;
  http_host?: string;
  http_url?: string;
  "timingPhases.dns": number;
  "timingPhases.connection": number;
  "timingPhases.tls": number;
  "timingPhases.ttfb": number;
  "timingPhases.transfer": number;
  "timingPhases.stalling": number;
}

export interface SignozTraceFilterSchema {
  serviceName?: string;
  httpMethod?: string;
  startTime?: number;
  endTime?: number;
}

// =============================================================================
// Utility Functions for Complex Transformations
// =============================================================================

// Helper function for string to boolean conversion
export const stringToBoolean = (val: string): boolean | undefined => {
  try {
    return JSON.parse(val.toLowerCase());
  } catch (e) {
    console.log(e);
    return undefined;
  }
};

// =============================================================================
// AJV Schemas
// =============================================================================

export const timingSchema = {
  type: "object",
  properties: {
    "timing.dns": { type: "number" },
    "timing.connection": { type: "number" },
    "timing.tls": { type: "number" },
    "timing.ttfb": { type: "number" },
    "timing.transfer": { type: "number" },
  },
  required: ["timing.dns", "timing.connection", "timing.tls", "timing.ttfb", "timing.transfer"],
  additionalProperties: false,
};

export const columnSchema = {
  type: "object",
  properties: {
    ...timingSchema.properties,
    uuid: { type: "string" },
    method: { type: "string", enum: [...METHODS] },
    host: { type: "string" },
    pathname: { type: "string" },
    level: { type: "string", enum: [...LEVELS] },
    latency: { type: "number" },
    status: { type: "number" },
    regions: { type: "array", items: { type: "string", enum: [...REGIONS] } },
    date: { type: "string", format: "date-time" },
    headers: { type: "object", additionalProperties: { type: "string" } },
    message: { type: "string" },
    percentile: { type: "number" },
  },
  required: [...timingSchema.required, "uuid", "method", "host", "pathname", "level", "latency", "status", "regions", "date", "headers"],
  additionalProperties: false,
};

// TODO: can we get rid of this in favor of nuqs search-params?
// Note: This schema handles string inputs that need transformation
// In AJV, we'll handle the transformation separately
export const columnFilterSchema = {
  type: "object",
  properties: {
    level: { type: "array", items: { type: "string", enum: [...LEVELS] } },
    method: { type: "array", items: { type: "string", enum: [...METHODS] } },
    host: { type: "string" },
    pathname: { type: "string" },
    latency: { type: "array", items: { type: "number" }, maxItems: 2 },
    "timing.dns": { type: "array", items: { type: "number" }, maxItems: 2 },
    "timing.connection": { type: "array", items: { type: "number" }, maxItems: 2 },
    "timing.tls": { type: "array", items: { type: "number" }, maxItems: 2 },
    "timing.ttfb": { type: "array", items: { type: "number" }, maxItems: 2 },
    "timing.transfer": { type: "array", items: { type: "number" }, maxItems: 2 },
    status: { type: "array", items: { type: "number" } },
    regions: { type: "array", items: { type: "string", enum: [...REGIONS] } },
    date: { type: "array", items: { type: "string", format: "date-time" } },
  },
  additionalProperties: false,
};

// =============================================================================
// Transform Utilities for Column Filter
// =============================================================================

export const transformColumnFilter = (data: Record<string, string>): ColumnFilterSchema => {
  const result: any = {};

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value !== "string") {
      result[key] = value;
      return;
    }

    switch (key) {
      case "level":
      case "method":
      case "regions":
        result[key] = value.split(ARRAY_DELIMITER);
        break;
      case "latency":
      case "timing.dns":
      case "timing.connection":
      case "timing.tls":
      case "timing.ttfb":
      case "timing.transfer":
        result[key] = value.split(SLIDER_DELIMITER).map(Number).slice(0, 2);
        break;
      case "status":
        result[key] = value.split(ARRAY_DELIMITER).map(Number);
        break;
      case "date":
        result[key] = value.split(RANGE_DELIMITER).map((num) => new Date(Number(num)));
        break;
      default:
        result[key] = value;
    }
  });

  return result;
};

export const facetMetadataSchema = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value: {}, // any type
          total: { type: "number" },
        },
        required: ["value", "total"],
        additionalProperties: false,
      },
    },
    total: { type: "number" },
    min: { type: "number" },
    max: { type: "number" },
  },
  required: ["rows", "total"],
  additionalProperties: false,
};

export const timelineChartSchema = {
  type: "object",
  properties: {
    timestamp: { type: "number" }, // UNIX
    ...LEVELS.reduce(
      (acc, level) => ({
        ...acc,
        [level]: { type: "number", default: 0 },
      }),
      {} as Record<(typeof LEVELS)[number], { type: string; default: number }>
    ),
  },
  required: ["timestamp", ...LEVELS],
  additionalProperties: false,
};

// =============================================================================
// Validators
// =============================================================================

export const validateTiming = createValidator<TimingSchema>(timingSchema);
export const validateColumn = createValidator<ColumnSchema>(columnSchema);
export const validateColumnFilter = createValidator<ColumnFilterSchema>(columnFilterSchema);
export const validateFacetMetadata = createValidator<FacetMetadataSchema>(facetMetadataSchema);
export const validateTimelineChart = createValidator<TimelineChartSchema>(timelineChartSchema);
