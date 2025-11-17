import { config as envConfig } from "../config/env";

export const centrifugeConfig = {
  // Centrifuge server configuration
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.CENTRIFUGE_PORT || "8091"),
    engine: "memory", // Use memory for development, Redis for production
    redis_host: envConfig.REDIS_HOST,
    redis_port: envConfig.REDIS_PORT,
    redis_password: envConfig.REDIS_PASSWORD,
    redis_db: 1, // Different DB from main app Redis
  },

  // gRPC server for Envoy ext_proc
  grpc: {
    host: "0.0.0.0",
    port: parseInt(process.env.GRPC_PORT || "9091"),
    proto_path: "./src/centrifuge/grpc/proto/ext_proc.proto",
  },

  // Authentication proxy configuration
  auth: {
    fastify_base_url: process.env.FASTIFY_BASE_URL || "http://localhost:8090",
    jwt_secret: envConfig.JWT_SECRET,
    token_header: "x-custom-auth",
    validation_endpoint: "/auth/validate-token",
  },

  // WebSocket configuration
  websocket: {
    allowed_origins: [
      "http://localhost:1430", // Portal
      "http://localhost:3000", // Local dev
      process.env.FRONTEND_URL || "https://app.p-zero.com",
    ],
    heartbeat_interval: 30000, // 30 seconds
    disconnect_delay: 5000, // 5 seconds
  },

  // Development settings
  development: {
    log_level: process.env.NODE_ENV === "production" ? "info" : "debug",
    enable_debug: process.env.NODE_ENV !== "production",
    hot_reload: process.env.NODE_ENV === "development",
  },

  // Production settings
  production: {
    cluster_mode: process.env.NODE_ENV === "production",
    workers: parseInt(process.env.CENTRIFUGE_WORKERS || "2"),
    metrics_enabled: true,
    metrics_port: parseInt(process.env.METRICS_PORT || "9092"),
  },
};
