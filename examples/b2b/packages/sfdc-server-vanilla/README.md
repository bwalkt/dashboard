# Salesforce Integration Server

A Fastify-based Node.js server that provides REST API endpoints for Salesforce integration, including authentication, data querying, and record management.

## 🚀 Features

- **Salesforce Authentication**: JWT-based authentication with Salesforce OAuth 2.0
- **REST API Endpoints**: Complete CRUD operations for Salesforce records
- **CORS Support**: Cross-origin resource sharing enabled for frontend integration
- **TypeScript**: Full TypeScript support with type definitions
- **Fastify Framework**: High-performance Node.js web framework
- **Environment Configuration**: Secure configuration management

## 📋 Prerequisites

- Node.js (v18 or higher)
- pnpm (recommended) or npm
- Salesforce Developer Account
- Salesforce Connected App credentials

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   # Salesforce Configuration (Required)
   SALESFORCE_CONSUMER_KEY=your_consumer_key_here
   SALESFORCE_USERNAME=your_username@example.com
   SALESFORCE_LOGIN_URL=https://login.salesforce.com

   # Server Configuration (Optional)
   PORT=8080
   NODE_ENV=development

   # GitHub OAuth Configuration (Required)
   GITHUB_CLIENT_ID=your_github_client_id_here
   GITHUB_CLIENT_SECRET=your_github_client_secret_here

   # JWT Configuration (Required)
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

   # Database Configuration (Optional)
   DATABASE_PATH=./database.db

   # OAuth Callback URL (Required)
   OAUTH_REDIRECT_URL=http://localhost:1420/auth/callback
   ```

4. **Build the project**
   ```bash
   pnpm build
   ```

## 🚀 Running the Server

### Development Mode

```bash
pnpm dev
```

### Production Mode

```bash
pnpm start
```

The server will start on `http://localhost:8080`

### Docker Deployment

The server can be deployed using Docker Compose, which includes the authz-service for challenge header validation.

#### Prerequisites

1. **Create Docker Network** (if not already created):
   ```bash
   docker network create pzero-network
   ```

2. **Environment Variables**: Ensure all required environment variables are set (see Environment Variables section below).

#### Development Deployment

From the `examples/b2b` directory:

```bash
docker compose up -d
```

This will start:
- `dragonfly` - Redis-compatible database for challenge storage
- `authz-service` - Authorization service for challenge validation (port 3002)
- `pzero-sfdc-server-vanilla` - The SFDC server (port 3000)

#### Production Deployment

For production, use `docker-compose.prod.yml`:

```bash
docker compose -f docker-compose.prod.yml up -d
```

**Important Production Notes:**

1. **Authz Service**: The authz-service must be deployed and accessible. Set `AUTHZ_SERVICE_URL` environment variable to point to the authz-service endpoint (default: `http://authz-service:3000`).

2. **Challenge Secret**: Set `CHALLENGE_SECRET` environment variable to match the secret used by the authz-service. This must be the same value in both services.

3. **Network Configuration**: Ensure all services are on the same Docker network (`pzero-network`) for internal communication.

4. **Service Dependencies**: The SFDC server depends on the authz-service being available. Authentication will fail if the authz-service is unreachable.

#### Challenge Header Validation

The server enforces challenge header validation for all authenticated requests:

- **Required Headers**: `x-challenge-id` and `x-challenge-answer`
- **Validation**: Headers are validated via the authz-service before authentication succeeds
- **Retry Logic**: The server includes automatic retry logic (2 retries) with 5-second timeout for authz-service calls
- **Failure Handling**: If the authz-service is unreachable or returns a negative response, authentication fails with a 401 Unauthorized error

#### Environment Variables for Docker

Additional environment variables for Docker deployment:

| Variable              | Description                                    | Required | Default                    |
| --------------------- | ---------------------------------------------- | -------- | -------------------------- |
| `AUTHZ_SERVICE_URL`   | URL of the authz-service endpoint             | No       | `http://authz-service:3000` |
| `REDIS_URL`            | Redis connection URL                           | No       | `redis://dragonfly:6379`   |
| `CHALLENGE_SECRET`     | Secret for challenge validation (must match authz-service) | Yes (production) | - |
| `DOCKER_CONTAINER`     | Set to `true` when running in Docker           | No       | -                          |

## 📚 API Endpoints

### Authentication (GitHub OAuth)

- `GET /auth/login` - Initiate GitHub OAuth flow
- `GET /auth/callback` - Handle OAuth callback from GitHub
- `GET /auth/me` - Get current user info (protected)
- `POST /auth/refresh` - Refresh access token (no access token required; uses refresh cookie)
- `POST /auth/logout` - Logout user (protected)

### Salesforce Integration

- `POST /salesforce/auth` - Authenticate with Salesforce (protected)

### Salesforce Data Operations

- `GET /salesforce/:objectType/query` - Query Salesforce records by object type (protected)
- `GET /salesforce/records/:objectType/:recordId` - Get specific record by ID (protected)
- `POST /salesforce/records/:objectType` - Create new record (protected)
- `PUT /salesforce/records/:objectType/:recordId` - Update existing record (protected)

### Salesforce Utility Endpoints

- `GET /salesforce/metadata/:objectType` - Get object metadata (protected)

### Salesforce Setup

1. **Create a Connected App** in Salesforce:

   - Go to Setup → App Manager → New Connected App
   - Enable OAuth Settings
   - Add callback URL: `http://localhost:8080/salesforce/callback`
   - Select required OAuth scopes

2. **Get Credentials**:
   - Consumer Key (Client ID)
   - Consumer Secret (Client Secret)
   - Username and Password for authentication

### Environment Variables

| Variable                  | Description                | Required                       |
| ------------------------- | -------------------------- | ------------------------------ |
| `SALESFORCE_CONSUMER_KEY` | Connected App Consumer Key | Yes                            |
| `SALESFORCE_USERNAME`     | Salesforce username        | Yes                            |
| `SALESFORCE_LOGIN_URL`    | Salesforce login URL       | No (defaults to production)    |
| `PORT`                    | Server port                | No (defaults to 8080)          |
| `NODE_ENV`                | Node environment           | No (defaults to development)   |
| `GITHUB_CLIENT_ID`        | GitHub OAuth Client ID     | Yes                            |
| `GITHUB_CLIENT_SECRET`    | GitHub OAuth Client Secret | Yes                            |
| `JWT_SECRET`              | JWT signing secret         | Yes                            |
| `DATABASE_PATH`           | SQLite database path       | No (defaults to ./database.db) |
| `OAUTH_REDIRECT_URL`      | OAuth callback URL         | Yes                            |
| `AUTHZ_SERVICE_URL`       | Authz service URL           | No (defaults to http://authz-service:3000) |
| `REDIS_URL`               | Redis connection URL        | No (defaults to redis://dragonfly:6379) |
| `CHALLENGE_SECRET`        | Challenge validation secret | Yes (production) |

## 📁 Project Structure

```
src/
├── config/
│   └── salesforce.ts          # Salesforce configuration
├── routes/
│   └── salesforce.ts          # API route definitions
├── services/
│   ├── salesforceClient.ts    # Salesforce API client
│   └── jwtService.ts          # JWT token management
├── types/
│   ├── salesforce.ts          # Salesforce type definitions
│   └── order.ts               # Order-specific types
├── index.ts                   # Main application setup
└── server.ts                  # Server entry point
```

## 🔒 Security Features

- **Environment Variables**: Sensitive data stored in `.env` file
- **JWT Tokens**: Secure token-based authentication
- **CORS Configuration**: Configurable cross-origin policies
- **Input Validation**: Request validation and sanitization

## 🧪 Development

### Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build TypeScript to JavaScript
- `pnpm start` - Start production server
- `pnpm clean` - Clean build artifacts

### Code Style

The project uses TypeScript with strict type checking. Ensure all new code includes proper type definitions.

## 📝 Example Usage

### GitHub OAuth Authentication

```bash
# Initiate OAuth flow
curl -X GET http://localhost:8080/auth/login

# Get current user info (requires authentication)
curl -X GET http://localhost:8080/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Salesforce Integration

```bash
# Authenticate with Salesforce (requires GitHub auth first)
curl -X POST http://localhost:8080/salesforce/auth \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Query Salesforce records
curl -X GET "http://localhost:8080/salesforce/Account/query" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a Salesforce record
curl -X POST http://localhost:8080/salesforce/records/Account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"Name": "Test Account"}'
```

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**

   - Verify Salesforce credentials in `.env` file
   - Check Connected App configuration
   - Ensure proper OAuth scopes are selected

2. **CORS Issues**

   - Verify CORS configuration in `src/index.ts`
   - Check frontend origin settings

3. **Build Errors**
   - Run `pnpm clean` and `pnpm build`
   - Check TypeScript configuration

## 📄 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions, please create an issue in the repository or contact the development team.
