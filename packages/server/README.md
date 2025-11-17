A Fastify-based Node.js server that provides REST API endpoints for Salesforce integration, including authentication, data querying, and record management.

## 🚀 Features

- This is server for pzero.
- TODO We will split as microservices and use bff pattern to access various services.
- **Gateway Proxy**: Secure pass-through proxy with header validation and JWT authentication
- **Header Validation**: Bot detection and security filtering with rate limiting
- **CORS Support**: Cross-origin resource sharing enabled for frontend integration
- **TypeScript**: Full TypeScript support with type definitions
- **Fastify Framework**: High-performance Node.js web framework
- **Environment Configuration**: Secure configuration management

## 📋 Prerequisites

- Node.js (v18 or higher)
- pnpm (recommended) or npm
- Docker and Docker Compose (for PostgreSQL and Redis)

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

   ```bash
   # Server Configuration (Optional)
   PORT=8090

   PORT=8080
   NODE_ENV=development

   # GitHub OAuth Configuration (Required)

   GITHUB_CLIENT_ID=your_github_client_id_here
   GITHUB_CLIENT_SECRET=your_github_client_secret_here

   # JWT Configuration (Required)

   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

   # PostgreSQL Database Configuration
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=pzero

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   # Database Configuration (Optional)

   DATABASE_PATH=./database.db

   # OAuth Callback URL (Required)

   OAUTH_REDIRECT_URL=http://localhost:1420/auth/callback

   ```

   ```

   ```

4. **Build the project**
   ```bash
   pnpm build
   ```

## 🚀 Running the Server

### With Docker (Recommended)

1. **Start all services (PostgreSQL, Redis, and Server)**

   ```bash
   docker-compose up -d
   ```

2. **View logs**

   ```bash
   docker-compose logs -f
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

### Local Development (without Docker)

1. **Start PostgreSQL and Redis using Docker**

   ```bash
   docker-compose up -d postgres redis
   ```

2. **Run the server locally**
   ```bash
   pnpm dev
   ```

### Production Mode

```bash
pnpm build
pnpm start
```

The server will start on `http://localhost:8090`

## 📚 API Endpoints

### Authentication (GitHub OAuth)

- `GET /auth/login` - Initiate GitHub OAuth flow
- `GET /auth/callback` - Handle OAuth callback from GitHub
- `GET /auth/me` - Get current user info (protected)
- `POST /auth/refresh` - Refresh access token (no access token required; uses refresh cookie)
- `POST /auth/logout` - Logout user (protected)

### Email Verification

- `POST /verify/email` - Send email verification (requires: `email`, optional: `name`)
- `GET /verify/email` - Verify email with token (requires: `token` query parameter)
- `POST /verify/email/resend` - Resend verification email (requires: `email`, optional: `name`)

### Gateway (Intelligent Routing & Admin Portal)

The server provides both **admin portal functionality** and **gateway proxy** capabilities with intelligent routing based on URL patterns.

#### Architecture Overview

**Single Fastify Server Architecture**: The gateway is **NOT a separate service**. It's the same Fastify server running on port 8090 (configurable via `PORT` environment variable) that provides both admin portal functionality and gateway proxy capabilities through intelligent URL-based routing.

```
Fastify Server (localhost:8090) - Admin Portal & Gateway
├── Admin Portal Routes (handled locally)
│   ├── /auth/* - Authentication & user management
│   ├── /billing/* - Billing & subscription management
│   ├── /email/* - Email verification
│   ├── /sms/* - SMS verification
│   └── /health - Health checks
└── Gateway Routes (forwarded to backend services)
    └── /gateway/* → Backend Services (e.g., localhost:8080)
```

#### Route Resolution

| URL Pattern  | Destination             | Purpose                               |
| ------------ | ----------------------- | ------------------------------------- |
| `/gateway/*` | `http://localhost:8080` | Backend service (sfdc-vanilla-server) |
| `/auth/*`    | `localhost:8090`        | Admin portal - user authentication    |
| `/billing/*` | `localhost:8090`        | Admin portal - billing management     |
| `/email/*`   | `localhost:8090`        | Admin portal - email verification     |
| `/sms/*`     | `localhost:8090`        | Admin portal - SMS verification       |
| `/health`    | `localhost:8090`        | Admin portal - health checks          |

**Examples**:

- `/gateway/api/users` → `http://localhost:8080/api/users` (forwarded)
- `/auth/login` → `localhost:8090/auth/login` (handled locally)
- `/billing/subscriptions` → `localhost:8090/billing/subscriptions` (handled locally)

#### Authentication

Gateway routes require authentication via one of these methods:

1. **JWT Header Authentication** (recommended):

   ```bash
   curl -H "x-custom-auth: YOUR_JWT_TOKEN" http://localhost:8090/gateway/api/users
   ```

2. **JWT Cookie Authentication**:
   ```bash
   curl -H "Cookie: accessToken=YOUR_JWT_TOKEN" http://localhost:8090/gateway/api/users
   ```

#### Features

- **🛡️ Security**: Blocks suspicious bots and crawlers
- **🔐 Authentication**: JWT token validation for all gateway routes
- **🧠 Intelligent Routing**: URL-based routing (admin vs gateway)
- **🌐 Admin Portal**: Handle auth, billing, email/SMS locally
- **🌐 Gateway Proxy**: Forward `/gateway/*` to backend services
- **📊 Monitoring**: Request/response logging with validation headers
- **🔄 Transparent**: Preserves original request/response data

#### Configuration

Required environment variables for gateway functionality:

```bash
# Proxy Configuration - Comma-separated list of allowed target domains
ALLOWED_DOMAINS=localhost:8080,127.0.0.1:8080,api.example.com:443

# Optional: Cookie domain override for forwarded Set-Cookie headers
COOKIE_DOMAIN=localhost
```

#### Usage Examples

1. **Basic authenticated request**:

   ```bash
   # Generate JWT token (example using Node.js)
   JWT_TOKEN=$(node -e "
   const jwt = require('jsonwebtoken');
   const token = jwt.sign({
     sub: 'user-123',
     exp: Math.floor(Date.now() / 1000) + 3600
   }, 'your_jwt_secret');
   console.log(token);
   ")

   # Make authenticated gateway request to backend service
   curl -H "User-Agent: Mozilla/5.0 (Browser)" \
        -H "x-custom-auth: $JWT_TOKEN" \
        http://localhost:8090/gateway/api/users
   ```

2. **POST request with body**:

   ```bash
   curl -X POST \
        -H "User-Agent: Mozilla/5.0 (Browser)" \
        -H "x-custom-auth: $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"John","email":"john@example.com"}' \
        http://localhost:8090/gateway/api/users
   ```

3. **Response headers verification**:
   ```bash
   curl -v -H "x-custom-auth: $JWT_TOKEN" \
        http://localhost:8090/gateway/health
   # Look for these authentication headers in response:
   # x-auth-validated: true
   # x-validation-method: custom-header
   # x-validation-timestamp: 1234567890123
   ```

#### Architecture

```
Client Request
     ↓
Fastify Server (localhost:8090)
     ├── Header Validation (blocks bots)
     ├── Authentication (JWT validation)
     ├── Intelligent Routing:
     │   ├── /gateway/* → Forward to Backend (localhost:8080)
     │   └── /auth/*, /billing/* → Handle Locally
     ↓
Target Server (8080) [if gateway route]
     ↓
Response + Auth Headers
     ↓
Client Response
```

#### Testing

Run the comprehensive gateway tests:

```bash
# Run all gateway tests
./test-curl-workflows.sh

# Or test individual components
curl http://localhost:8090/health  # Should block (suspicious bot)
curl -H "User-Agent: Mozilla/5.0 (Browser)" http://localhost:8090/health  # Should allow
curl -H "User-Agent: Mozilla/5.0 (Browser)" http://localhost:8090/gateway/  # Should require auth
```

### Environment Variables

| Variable               | Description                   | Required                           |
| ---------------------- | ----------------------------- | ---------------------------------- |
| `PORT`                 | Server port                   | No (defaults to 8090)              |
| `NODE_ENV`             | Node environment              | No (defaults to development)       |
| `GITHUB_CLIENT_ID`     | GitHub OAuth Client ID        | Yes                                |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret    | Yes                                |
| `JWT_SECRET`           | JWT signing secret            | Yes                                |
| `POSTGRES_HOST`        | PostgreSQL host               | No (defaults to localhost)         |
| `POSTGRES_PORT`        | PostgreSQL port               | No (defaults to 5432)              |
| `POSTGRES_USER`        | PostgreSQL username           | No (defaults to postgres)          |
| `POSTGRES_PASSWORD`    | PostgreSQL password           | No (defaults to postgres)          |
| `POSTGRES_DB`          | PostgreSQL database name      | No (defaults to pzero)             |
| `REDIS_HOST`           | Redis host                    | No (defaults to localhost)         |
| `REDIS_PORT`           | Redis port                    | No (defaults to 6379)              |
| `BREVO_API_KEY`        | Brevo API key for email       | Yes                                |
| `BREVO_SENDER_EMAIL`   | Sender email address          | Yes                                |
| `BREVO_SENDER_NAME`    | Sender name                   | No (defaults to P-Zero)            |
| `OAUTH_REDIRECT_URL`   | OAuth callback URL            | Yes                                |
| `ALLOWED_DOMAINS`      | Gateway proxy allowed domains | Required for gateway functionality |
| `COOKIE_DOMAIN`        | Cookie domain override        | No (for gateway functionality)     |

## 📁 Project Structure

```
src/
├── config/
│   ├── database.ts           # PostgreSQL connection pool
│   ├── redis.ts              # Redis client configuration
│   └── env.ts                # Environment configuration
├── emails/
│   └── verification-email.tsx # Email verification React Email template
├── middleware/
│   └── auth.ts               # Authentication middleware
├── routes/
│   ├── auth.ts               # Authentication routes
│   └── email.ts              # Email verification routes
├── services/
│   ├── auth.service.ts       # Authentication service
│   ├── email.service.ts      # Email service (Brevo integration)
│   ├── jwt.service.ts        # JWT token service
│   └── user.service.ts       # User service
├── types/
│   └── index.ts              # TypeScript type definitions
├── index.ts                  # Main application setup
└── server.ts                 # Server entry point
docker-compose.yml            # Docker services configuration
Dockerfile                    # Server Docker image
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
curl -X GET http://localhost:8090/auth/login

# Get current user info (requires authentication)
curl -X GET http://localhost:8090/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Email Verification

```bash
# Send verification email
curl -X POST http://localhost:8090/verify/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe"
  }'

# Verify email with token
curl -X GET "http://localhost:8090/verify/email?token=YOUR_VERIFICATION_TOKEN"

# Resend verification email
curl -X POST http://localhost:8090/verify/email/resend \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe"
  }'
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Ensure PostgreSQL container is running: `docker-compose ps`
   - Check PostgreSQL logs: `docker-compose logs postgres`
   - Verify environment variables in `.env` file

2. **Redis Connection Errors**

   - Ensure Redis container is running: `docker-compose ps`
   - Check Redis logs: `docker-compose logs redis`

3. **Authentication Errors**

   - Verify GitHub OAuth credentials in `.env`
   - Check OAuth callback URL matches your configuration

4. **CORS Issues**

   - Verify CORS configuration in `src/index.ts`
   - Check frontend origin settings

5. **Build Errors**
   - Run `pnpm clean` and `pnpm build`
   - Check TypeScript configuration

### Database Migration from SQLite

If you're migrating from the old SQLite database:

- The old `database.db` file is no longer used
- User data will need to be re-created in PostgreSQL
- All database operations are now asynchronous

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
