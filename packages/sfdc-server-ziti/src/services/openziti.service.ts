import { EventEmitter } from "events";
import { spawn, type ChildProcess } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import WebSocket from "ws";
import type { OpenZitiConfig, OpenZitiIdentity, OpenZitiTunnelerConfig } from "../config/openziti.js";
import { loadOpenZitiIdentity, loadOpenZitiTunnelerConfig } from "../config/openziti.js";

export interface OpenZitiConnection {
  id: string;
  remoteAddress: string;
  localAddress: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface OpenZitiServiceStatus {
  isConnected: boolean;
  serviceName: string;
  localAddress: string;
  activeConnections: number;
  uptime: number;
  lastError?: string;
}

export class OpenZitiService extends EventEmitter {
  private config: OpenZitiConfig;
  private tunnelerProcess: ChildProcess | undefined;
  private websocketServer: WebSocket.Server | undefined;
  private connections: Map<string, OpenZitiConnection> = new Map();
  private startTime: Date = new Date();
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(config: OpenZitiConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize and start the OpenZiti service
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log("OpenZiti integration is disabled");
      return;
    }

    console.log("Starting OpenZiti service...");

    try {
      if (this.config.tunnelerEnabled) {
        await this.startTunneler();
      } else {
        await this.startEmbeddedService();
      }

      this.isRunning = true;
      this.startTime = new Date();
      this.emit("started");
      console.log("OpenZiti service started successfully");
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Stop the OpenZiti service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log("Stopping OpenZiti service...");

    try {
      if (this.tunnelerProcess) {
        this.tunnelerProcess.kill("SIGTERM");
        this.tunnelerProcess = undefined;
      }

      if (this.websocketServer) {
        this.websocketServer.close();
        this.websocketServer = undefined;
      }

      this.connections.clear();
      this.isRunning = false;
      this.emit("stopped");
      console.log("OpenZiti service stopped");
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Get the current status of the OpenZiti service
   */
  getStatus(): OpenZitiServiceStatus {
    const uptime = Date.now() - this.startTime.getTime();

    return {
      isConnected: this.isRunning,
      serviceName: this.config.serviceName,
      localAddress: this.config.localAddress,
      activeConnections: this.connections.size,
      uptime,
    };
  }

  /**
   * Get active connections
   */
  getConnections(): OpenZitiConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Start the OpenZiti tunneler process
   */
  private async startTunneler(): Promise<void> {
    if (!existsSync(this.config.tunnelerConfigPath)) {
      throw new Error(`Tunneler config file not found: ${this.config.tunnelerConfigPath}`);
    }

    const tunnelerConfig = loadOpenZitiTunnelerConfig(this.config.tunnelerConfigPath);

    // Start the OpenZiti tunneler process
    // Note: This assumes the ziti tunneler binary is available in PATH
    this.tunnelerProcess = spawn("ziti", ["tunnel", "run", "--config", this.config.tunnelerConfigPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    this.tunnelerProcess.stdout?.on("data", (data) => {
      console.log(`OpenZiti Tunneler: ${data.toString()}`);
    });

    this.tunnelerProcess.stderr?.on("data", (data) => {
      console.error(`OpenZiti Tunneler Error: ${data.toString()}`);
    });

    this.tunnelerProcess.on("exit", (code) => {
      console.log(`OpenZiti Tunneler exited with code ${code}`);
      if (code !== 0 && this.isRunning) {
        this.handleReconnection();
      }
    });

    this.tunnelerProcess.on("error", (error) => {
      console.error("OpenZiti Tunneler process error:", error);
      this.emit("error", error);
    });

    // Wait a moment for the tunneler to start
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Start embedded OpenZiti service (WebSocket-based implementation)
   */
  private async startEmbeddedService(): Promise<void> {
    if (!existsSync(this.config.identityPath)) {
      throw new Error(`Identity file not found: ${this.config.identityPath}`);
    }

    const identity = loadOpenZitiIdentity(this.config.identityPath);

    // Create WebSocket server for OpenZiti connections
    const [host, port] = this.config.localAddress.split(":");
    this.websocketServer = new WebSocket.Server({
      host: host || "127.0.0.1",
      port: parseInt(port || "8080", 10),
    });

    this.websocketServer.on("connection", (ws, req) => {
      const connectionId = this.generateConnectionId();
      const remoteAddress = req.socket.remoteAddress || "unknown";

      const connection: OpenZitiConnection = {
        id: connectionId,
        remoteAddress,
        localAddress: this.config.localAddress,
        connectedAt: new Date(),
        lastActivity: new Date(),
      };

      this.connections.set(connectionId, connection);
      this.emit("connection", connection);

      ws.on("message", (data) => {
        connection.lastActivity = new Date();
        this.emit("message", { connectionId, data });
      });

      ws.on("close", () => {
        this.connections.delete(connectionId);
        this.emit("disconnection", connection);
      });

      ws.on("error", (error) => {
        console.error(`WebSocket error for connection ${connectionId}:`, error);
        this.emit("error", error);
      });
    });

    this.websocketServer.on("error", (error) => {
      console.error("WebSocket server error:", error);
      this.emit("error", error);
    });

    console.log(`OpenZiti WebSocket server listening on ${this.config.localAddress}`);
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.emit("error", new Error("Max reconnection attempts reached"));
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.start();
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error("Reconnection failed:", error);
        this.handleReconnection();
      }
    }, 5000 * this.reconnectAttempts);
  }

  /**
   * Generate a unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send a message to a specific connection
   */
  sendMessage(connectionId: string, message: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    // In a real implementation, you would send the message through the OpenZiti connection
    // For now, we'll just emit an event
    this.emit("sendMessage", { connectionId, message });
    return true;
  }

  /**
   * Broadcast a message to all connections
   */
  broadcastMessage(message: string): void {
    for (const connectionId of this.connections.keys()) {
      this.sendMessage(connectionId, message);
    }
  }
}
