import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Centrifuge } from "centrifuge";
import path from "path";
import { createAuthProxy } from "./auth-proxy";
import { centrifugeConfig } from "./config";
import { createExtProcService } from "./grpc/services/ext-proc";

export class CentrifugeServer {
  private centrifuge: Centrifuge;
  private grpcServer: grpc.Server;
  private authProxy: any;

  constructor() {
    this.centrifuge = new Centrifuge({
      // Use Redis engine for production, memory for development
      engine:
        centrifugeConfig.server.engine === "memory"
          ? undefined
          : {
              type: "redis",
              host: centrifugeConfig.server.redis_host,
              port: centrifugeConfig.server.redis_port,
              password: centrifugeConfig.server.redis_password,
              db: centrifugeConfig.server.redis_db,
            },

      // Authentication via Fastify proxy
      on: {
        connect: async (ctx) => {
          const { client, transport } = ctx;
          console.log(
            `Client ${client.id()} connected via ${transport.name()}`,
          );

          // Validate token via Fastify auth proxy
          const token =
            client.transport().protocol() === "websocket"
              ? ctx.data?.token
              : ctx.data?.headers?.[centrifugeConfig.auth.token_header];

          if (!token) {
            console.log(`Client ${client.id()} missing auth token`);
            throw new Error("Authentication required");
          }

          try {
            const authResult = await this.authProxy.validateToken(token);
            if (!authResult.valid) {
              throw new Error("Invalid authentication token");
            }

            // Store user info in client context
            client.user = authResult.user;
            console.log(
              `Client ${client.id()} authenticated as user ${authResult.user.id}`,
            );

            return {
              user: authResult.user.id.toString(),
              data: authResult.user,
            };
          } catch (error) {
            console.error(`Auth failed for client ${client.id()}:`, error);
            throw new Error("Authentication failed");
          }
        },

        subscribe: async (ctx) => {
          const { client, channel } = ctx;
          console.log(
            `Client ${client.id()} subscribing to channel: ${channel}`,
          );

          // Channel authorization logic
          const user = client.user;
          if (!user) {
            throw new Error("User not authenticated");
          }

          // Example channel authorization rules
          if (
            channel.startsWith("user:") &&
            !channel.includes(user.id.toString())
          ) {
            throw new Error("Not authorized for this channel");
          }

          if (channel.startsWith("admin:") && !user.role?.includes("admin")) {
            throw new Error("Admin access required");
          }

          return {};
        },

        publish: async (ctx) => {
          const { client, channel } = ctx;
          console.log(
            `Client ${client.id()} publishing to channel: ${channel}`,
          );

          // Publish authorization (similar to subscribe)
          const user = client.user;
          if (!user) {
            throw new Error("User not authenticated");
          }

          // Basic authorization rules
          if (
            channel.startsWith("user:") &&
            !channel.includes(user.id.toString())
          ) {
            throw new Error("Not authorized to publish to this channel");
          }

          return {};
        },

        disconnect: (ctx) => {
          const { client, disconnect } = ctx;
          console.log(`Client ${client.id()} disconnected:`, disconnect);
        },
      },

      // WebSocket configuration
      websocket: {
        compression: true,
        read_buffer_size: 1024,
        write_buffer_size: 1024,
        allowed_origins: centrifugeConfig.websocket.allowed_origins,
      },

      // Logging
      log_level: centrifugeConfig.development.log_level as any,
    });

    // Initialize gRPC server for Envoy ext_proc
    this.grpcServer = new grpc.Server();
    this.authProxy = createAuthProxy();
  }

  async start(): Promise<void> {
    try {
      // Start Centrifuge WebSocket server
      await this.startCentrifuge();

      // Start gRPC server for Envoy
      await this.startGrpcServer();

      console.log("🚀 Centrifuge server started successfully");
      console.log(
        `📡 WebSocket server: http://${centrifugeConfig.server.host}:${centrifugeConfig.server.port}`,
      );
      console.log(
        `🔧 gRPC server: ${centrifugeConfig.grpc.host}:${centrifugeConfig.grpc.port}`,
      );
    } catch (error) {
      console.error("❌ Failed to start Centrifuge server:", error);
      throw error;
    }
  }

  private async startCentrifuge(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.centrifuge.listen(
        centrifugeConfig.server.port,
        centrifugeConfig.server.host,
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
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
    const extProcService = createExtProcService(
      this.centrifuge,
      this.authProxy,
    );
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

        // Stop Centrifuge
        this.centrifuge.shutdown();
        console.log("✅ Centrifuge server shut down");
        resolve();
      });
    });
  }

  // Helper methods for external use
  public getCentrifuge(): Centrifuge {
    return this.centrifuge;
  }

  public publishToChannel(channel: string, data: any): Promise<void> {
    return this.centrifuge.publish(channel, data);
  }

  public getClientCount(): number {
    return this.centrifuge.numClients();
  }

  public getChannels(): string[] {
    return this.centrifuge.channels();
  }
}

// Export singleton instance
export const centrifugeServer = new CentrifugeServer();
