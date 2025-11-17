// Common gRPC interfaces shared between client and server
// Based on Envoy External Processor service

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role?: string[];
  verified?: boolean;
}

export interface AuthResult {
  valid: boolean;
  user?: AuthUser;
  error?: string;
}

export interface ProcessingRequest {
  request_headers?: {
    headers: { [key: string]: string };
    end_of_stream: boolean;
  };
  request_body?: {
    body: Buffer;
    end_of_stream: boolean;
  };
  response_headers?: {
    headers: { [key: string]: string };
    end_of_stream: boolean;
  };
  response_body?: {
    body: Buffer;
    end_of_stream: boolean;
  };
}

export interface HeaderMutation {
  set_headers: Array<{ header: string; value: string; append: boolean }>;
  remove_headers: string[];
}

export interface BodyMutation {
  body: Buffer;
  clear_body: boolean;
}

export interface ProcessingResponse {
  request_headers?: {
    response: {
      status: number; // 0 = CONTINUE, 1 = CONTINUE_AND_REPLACE
      header_mutation?: HeaderMutation;
      body_mutation?: BodyMutation;
    };
  };
  response_headers?: {
    response: {
      status: number;
      header_mutation?: HeaderMutation;
    };
  };
  request_body?: {
    response: {
      status: number; // 0 = CONTINUE, 1 = CONTINUE_AND_REPLACE
      header_mutation?: HeaderMutation;
      body_mutation?: BodyMutation;
    };
  };
  response_body?: {
    response: {
      status: number; // 0 = CONTINUE, 1 = CONTINUE_AND_REPLACE
      header_mutation?: HeaderMutation;
      body_mutation?: BodyMutation;
    };
  };
  immediate_response?: {
    status: number;
    headers: { [key: string]: string };
    body: string;
    grpc_status: { status: number };
    details: string;
  };
}

// Constants for gRPC status codes
export const ProcessingStatus = {
  CONTINUE: 0,
  CONTINUE_AND_REPLACE: 1,
} as const;

export type ProcessingStatusType = typeof ProcessingStatus[keyof typeof ProcessingStatus];

// gRPC status codes
export const GrpcStatus = {
  OK: 0,
  CANCELLED: 1,
  UNKNOWN: 2,
  INVALID_ARGUMENT: 3,
  DEADLINE_EXCEEDED: 4,
  NOT_FOUND: 5,
  ALREADY_EXISTS: 6,
  PERMISSION_DENIED: 7,
  RESOURCE_EXHAUSTED: 8,
  FAILED_PRECONDITION: 9,
  ABORTED: 10,
  OUT_OF_RANGE: 11,
  UNIMPLEMENTED: 12,
  INTERNAL: 13,
  UNAVAILABLE: 14,
  DATA_LOSS: 15,
  UNAUTHENTICATED: 16,
} as const;

export type GrpcStatusType = typeof GrpcStatus[keyof typeof GrpcStatus];