import axios, { type AxiosRequestConfig } from "axios";
import { JWTService } from "./jwt.service.js";
import type {
  SalesforceConfig,
  SalesforceAuthResponse,
  SalesforceQueryResponse,
  SalesforceRecordResponse,
  SalesforceObjectMetadata,
  HttpMethod,
  SalesforceAuthResponseRaw,
} from "../types/salesforce.js";

/**
 * Salesforce API Client with JWT OAuth2 authentication
 * Handles authentication and API calls to Salesforce
 */
export class SalesforceClient {
  public readonly consumerKey: string;
  public readonly username: string;
  public readonly loginUrl: string;
  public instanceUrl: string | null = null;
  public accessToken: string | null = null;
  public tokenExpiresAt: number | null = null;
  private readonly jwtService: JWTService;

  constructor(config: Partial<SalesforceConfig> = {}) {
    this.consumerKey = config.consumerKey || process.env.SALESFORCE_CONSUMER_KEY || "";
    this.username = config.username || process.env.SALESFORCE_USERNAME || "";
    this.loginUrl = config.loginUrl || process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com";
    this.jwtService = new JWTService();

    if (!this.consumerKey) {
      throw new Error("Salesforce consumer key is required. Set SALESFORCE_CONSUMER_KEY environment variable.");
    }
    if (!this.username) {
      throw new Error("Salesforce username is required. Set SALESFORCE_USERNAME environment variable.");
    }
  }

  /**
   * Authenticate with Salesforce using JWT Bearer flow
   * @returns Authentication response with access token and instance URL
   */
  async authenticate(): Promise<SalesforceAuthResponse> {
    try {
      const jwtAssertion = this.jwtService.createJWTAssertion({
        consumerKey: this.consumerKey,
        username: this.username,
        loginUrl: this.loginUrl,
      });

      const tokenEndpoint = `${this.loginUrl}/services/oauth2/token`;

      const response = await axios.post<SalesforceAuthResponseRaw>(
        tokenEndpoint,
        new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwtAssertion,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token, instance_url, token_type, scope } = response.data;

      this.accessToken = access_token;
      this.instanceUrl = instance_url;

      // Try to get actual expiration time from the token, fallback to 30 minutes if not available
      const tokenExpiration = this.jwtService.getTokenExpirationTime(access_token);
      if (tokenExpiration) {
        this.tokenExpiresAt = tokenExpiration;
        console.log(`Token expiration decoded from JWT: ${new Date(tokenExpiration).toISOString()}`);
      } else {
        this.tokenExpiresAt = Date.now() + 30 * 60 * 1000;
        console.log(`Token expiration set to default 30 minutes: ${new Date(this.tokenExpiresAt).toISOString()}`);
      }

      return {
        accessToken: access_token,
        instanceUrl: instance_url,
        tokenType: token_type,
        scope: scope,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(`Salesforce authentication failed: ${errorData.error_description || errorData.error || "Unknown error"}`);
      }
      throw new Error(`Salesforce authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check if the current token is expired or will expire soon
   * @param bufferMinutes - Minutes before expiration to consider token as expired (default: 5)
   * @returns True if token is expired or will expire soon
   */
  isTokenExpired(bufferMinutes: number = 5): boolean {
    if (!this.tokenExpiresAt) {
      return true; // No expiration set, consider expired
    }
    const bufferMs = bufferMinutes * 60 * 1000;
    return Date.now() + bufferMs >= this.tokenExpiresAt;
  }

  /**
   * Check if client is authenticated
   * @returns Authentication status
   */
  isAuthenticated(): boolean {
    return !!(this.accessToken && this.instanceUrl);
  }

  /**
   * Ensure token is valid, refresh if necessary
   * @returns Promise that resolves when token is valid
   */
  async ensureValidToken(): Promise<void> {
    if (!this.isAuthenticated() || this.isTokenExpired()) {
      await this.authenticate();
    }
  }

  /**
   * Make authenticated API call to Salesforce
   * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param endpoint - API endpoint (relative to instance URL)
   * @param data - Request data for POST/PUT requests
   * @param headers - Additional headers
   * @returns API response
   */
  async apiCall(method: HttpMethod, endpoint: string, data: Record<string, any> | null = null, headers: Record<string, string> = {}): Promise<any> {
    // Ensure token is valid before making API call
    await this.ensureValidToken();

    if (!this.accessToken || !this.instanceUrl) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    const url = endpoint.startsWith("http") ? endpoint : `${this.instanceUrl}${endpoint}`;

    const config: AxiosRequestConfig = {
      method: method.toLowerCase(),
      url,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (data && ["post", "put", "patch"].includes(method.toLowerCase())) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(`Salesforce API call failed: ${JSON.stringify(errorData)}`);
      }
      throw new Error(`Salesforce API call failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get Salesforce organization information
   * @returns Organization details
   */
  async getOrganizationInfo(): Promise<any> {
    return await this.apiCall("GET", "/services/data/v58.0/sobjects/Organization/describe");
  }

  /**
   * Query Salesforce records with pagination support
   * @param soql - SOQL query string
   * @param nextRecordsUrl - Optional next records URL for pagination
   * @returns Query results with pagination info
   */
  async queryPaginated(soql: string, nextRecordsUrl?: string): Promise<SalesforceQueryResponse> {
    if (nextRecordsUrl) {
      // Use the nextRecordsUrl for subsequent pages
      return await this.apiCall("GET", nextRecordsUrl);
    } else {
      // First page - use the SOQL query
      const encodedQuery = encodeURIComponent(soql);
      return await this.apiCall("GET", `/services/data/v58.0/query/?q=${encodedQuery}`);
    }
  }

  /**
   * Query Salesforce records with pagination to fetch all records
   * @param soql - SOQL query string
   * @returns All query results across all pages
   */
  async queryAll(soql: string): Promise<SalesforceQueryResponse> {
    const encodedQuery = encodeURIComponent(soql);
    let allRecords: Record<string, any>[] = [];
    let totalSize = 0;
    let done = true;
    let nextRecordsUrl: string | undefined;

    // First query
    const firstResponse = await this.apiCall("GET", `/services/data/v58.0/query/?q=${encodedQuery}`);
    allRecords = [...firstResponse.records];
    totalSize = firstResponse.totalSize;
    done = firstResponse.done || false;
    nextRecordsUrl = firstResponse.nextRecordsUrl;

    // Fetch remaining pages if needed
    while (!done && nextRecordsUrl) {
      const nextResponse = await this.apiCall("GET", nextRecordsUrl);
      allRecords = [...allRecords, ...nextResponse.records];
      done = nextResponse.done || false;
      nextRecordsUrl = nextResponse.nextRecordsUrl;
    }

    return {
      totalSize,
      done: true,
      records: allRecords,
    };
  }

  /**
   * Unified record operations (create, read, update)
   * @param operation - Operation type: 'create', 'read', 'update'
   * @param objectType - Salesforce object type (e.g., 'Account', 'Contact')
   * @param recordId - Record ID (required for read, update)
   * @param recordData - Record data (required for create, update)
   * @param fields - Fields to retrieve (optional for read)
   * @returns Operation response
   */
  async recordOperation(
    operation: "create" | "read" | "update",
    objectType: string,
    recordId?: string,
    recordData?: Record<string, any>,
    fields?: string[]
  ): Promise<any> {
    const baseEndpoint = `/services/data/v58.0/sobjects/${objectType}`;

    switch (operation) {
      case "create":
        if (!recordData) throw new Error("Record data is required for create operation");
        return await this.apiCall("POST", `${baseEndpoint}/`, recordData);

      case "read":
        if (!recordId) throw new Error("Record ID is required for read operation");
        let endpoint = `${baseEndpoint}/${recordId}`;
        if (fields && fields.length > 0) {
          endpoint += `?fields=${fields.join(",")}`;
        }
        return await this.apiCall("GET", endpoint);

      case "update":
        if (!recordId || !recordData) throw new Error("Record ID and data are required for update operation");
        return await this.apiCall("PATCH", `${baseEndpoint}/${recordId}`, recordData);

      default:
        throw new Error(`Invalid operation: ${operation}`);
    }
  }

  /**
   * Create a new record
   */
  async createRecord(objectType: string, recordData: Record<string, any>): Promise<SalesforceRecordResponse> {
    return await this.recordOperation("create", objectType, undefined, recordData);
  }

  /**
   * Get record by ID
   */
  async getRecord(objectType: string, recordId: string, fields: string[] | null = null): Promise<any> {
    return await this.recordOperation("read", objectType, recordId, undefined, fields || undefined);
  }

  /**
   * Update a record
   */
  async updateRecord(objectType: string, recordId: string, recordData: Record<string, any>): Promise<any> {
    return await this.recordOperation("update", objectType, recordId, recordData);
  }

  /**
   * Get object metadata
   * @param objectType - Salesforce object type
   * @returns Object metadata
   */
  async getObjectMetadata(objectType: string): Promise<SalesforceObjectMetadata> {
    return await this.apiCall("GET", `/services/data/v58.0/sobjects/${objectType}/describe`);
  }
}
