import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { createAuthProxy } from "./auth-proxy.js";
import { centrifugeConfig } from "./config.js";
import { createExtProcService } from "./grpc/services/ext-proc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CentrifugeServer {
  private grpcServer: grpc.Server;
  private authProxy: any;
  private centrifugoApiUrl: string;
  private centrifugoApiKey: string;

  constructor() {
    // Initialize gRPC server for Envoy ext_proc
    this.grpcServer = new grpc.Server();
    this.authProxy = createAuthProxy();

    // Centrifugo API configuration
    this.centrifugoApiUrl =
      process.env.CENTRIFUGO_API_URL || "http://localhost:8092";
    this.centrifugoApiKey =
      process.env.CENTRIFUGO_API_KEY || "api-key-for-server";

    console.log("🔧 CentrifugeServer initialized with:");
    console.log(`  - Centrifugo API: ${this.centrifugoApiUrl}`);
    console.log(`  - gRPC server for Envoy ext_proc`);
  }

  async start(): Promise<void> {
    try {
      // Test Centrifugo connection
      await this.testCentrifugoConnection();

      // Start gRPC server for Envoy
      await this.startGrpcServer();

      console.log("🚀 Centrifuge server started successfully");
      console.log(
        `📡 Centrifugo WebSocket: ${this.centrifugoApiUrl.replace("8001", "8000")}`,
      );
      console.log(
        `🔧 gRPC server: ${centrifugeConfig.grpc.host}:${centrifugeConfig.grpc.port}`,
      );
    } catch (error) {
      console.error("❌ Failed to start Centrifuge server:", error);
      throw error;
    }
  }

  private async testCentrifugoConnection(): Promise<void> {
    try {
      console.log("🔍 Testing Centrifugo API connection...");
      const response = await axios.post(
        `${this.centrifugoApiUrl}/api`,
        {
          method: "info",
        },
        {
          headers: {
            Authorization: `apikey ${this.centrifugoApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 5000,
        },
      );

      if (response.data) {
        console.log("✅ Centrifugo API connection successful");
        console.log(
          `   Version: ${response.data.result?.version || "unknown"}`,
        );
      }
    } catch (error) {
      console.warn(
        "⚠️  Centrifugo not available yet (will connect later):",
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async startGrpcServer(): Promise<void> {
    // Load proto definitions
    const protoPath = path.resolve(
      __dirname,
      centrifugeConfig.grpc.proto_path.replace("./src/centrifuge/", ""),
    );
    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDefinition) as any;

    // Register ext_proc service
    const extProcService = createExtProcService(this.authProxy);
    this.grpcServer.addService(
      proto.envoy.service.ext_proc.v3.ExternalProcessor.service,
      extProcService,
    );

    // Start gRPC server
    return new Promise((resolve, reject) => {
      this.grpcServer.bindAsync(
        `${centrifugeConfig.grpc.host}:${centrifugeConfig.grpc.port}`,
        grpc.ServerCredentials.createInsecure(),
        (err: Error | null, port: number) => {
          if (err) {
            reject(err);
          } else {
            this.grpcServer.start();
            console.log(`📡 gRPC server bound to port ${port}`);
            resolve();
          }
        },
      );
    });
  }

  async stop(): Promise<void> {
    console.log("🛑 Shutting down Centrifuge server...");

    // Stop gRPC server
    return new Promise((resolve) => {
      this.grpcServer.tryShutdown((err) => {
        if (err) {
          console.error("Error shutting down gRPC server:", err);
        } else {
          console.log("✅ gRPC server shut down");
        }

        console.log("✅ Centrifuge server shut down");
        resolve();
      });
    });
  }

  // Helper methods for Centrifugo API interactions
  public async publishToChannel(channel: string, data: any): Promise<void> {
    try {
      await axios.post(
        `${this.centrifugoApiUrl}/api`,
        {
          method: "publish",
          params: {
            channel,
            data,
          },
        },
        {
          headers: {
            Authorization: `apikey ${this.centrifugoApiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(`📤 Published to channel ${channel}`);
    } catch (error) {
      console.error(`❌ Failed to publish to channel ${channel}:`, error);
      throw error;
    }
  }

  public async getChannelsInfo(): Promise<any> {
    try {
      const response = await axios.post(
        `${this.centrifugoApiUrl}/api`,
        {
          method: "channels",
        },
        {
          headers: {
            Authorization: `apikey ${this.centrifugoApiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      return response.data.result;
    } catch (error) {
      console.error("❌ Failed to get channels info:", error);
      return {};
    }
  }

  public async disconnectUser(userId: string): Promise<void> {
    try {
      await axios.post(
        `${this.centrifugoApiUrl}/api`,
        {
          method: "disconnect",
          params: {
            user: userId,
          },
        },
        {
          headers: {
            Authorization: `apikey ${this.centrifugoApiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(`👤 Disconnected user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to disconnect user ${userId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const centrifugeServer = new CentrifugeServer();
