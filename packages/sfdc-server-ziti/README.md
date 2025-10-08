# Salesforce Integration Server

A Fastify-based Node.js server that provides REST API endpoints for Salesforce integration, including authentication, data querying, and record management.

## 🚀 Features

- **Salesforce Authentication**: JWT-based authentication with Salesforce OAuth 2.0
- **REST API Endpoints**: Complete CRUD operations for Salesforce records
- **CORS Support**: Cross-origin resource sharing enabled for frontend integration
- **TypeScript**: Full TypeScript support with type definitions
- **Fastify Framework**: High-performance Node.js web framework
- **Environment Configuration**: Secure configuration management
- **OpenZiti Integration**: Zero-trust networking with encrypted connections and fine-grained access control

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

   # OpenZiti Configuration (Optional)
   OPENZITI_ENABLED=false
   OPENZITI_CONTROLLER_URL=https://your-controller.example.com:1280
   OPENZITI_IDENTITY_PATH=./config/ziti-identity.json
   OPENZITI_SERVICE_NAME=sfdc-api-server
   OPENZITI_LOCAL_ADDRESS=127.0.0.1:8080
   OPENZITI_TUNNELER_ENABLED=false
   OPENZITI_TUNNELER_CONFIG_PATH=./config/tunneler.json
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

## 📚 API Endpoints

### Authentication (GitHub OAuth)

- `GET /auth/login` - Initiate GitHub OAuth flow
- `GET /auth/callback` - Handle OAuth callback from GitHub
- `GET /auth/me` - Get current user info (protected)
- `GET /auth/refresh` - Refresh access token
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

### OpenZiti Health Check

- `GET /health/openziti` - Get OpenZiti service status and connection information

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

### OpenZiti Setup (Optional)

1. **Install OpenZiti CLI**:

   ```bash
   # Download and install OpenZiti CLI
   wget https://github.com/openziti/ziti/releases/latest/download/ziti-linux-amd64-0.38.0.tar.gz
   tar -xzf ziti-linux-amd64-0.38.0.tar.gz
   sudo mv ziti /usr/local/bin/
   ```

2. **Create OpenZiti Network**:

   - Deploy an OpenZiti Controller and Edge Router
   - Create identities for your server and clients
   - Define services and policies in OpenZiti
   - Enroll identities

3. **Configure Identity**:

   - Copy `config/ziti-identity.json.example` to `config/ziti-identity.json`
   - Replace placeholder values with your actual OpenZiti identity credentials

4. **Enable OpenZiti**:
   - Set `OPENZITI_ENABLED=true` in your `.env` file
   - Configure other OpenZiti environment variables as needed

For detailed OpenZiti setup instructions, see [OPENZITI.md](./OPENZITI.md).

### Environment Variables

| Variable                        | Description                 | Required                         |
| ------------------------------- | --------------------------- | -------------------------------- |
| `SALESFORCE_CONSUMER_KEY`       | Connected App Consumer Key  | Yes                              |
| `SALESFORCE_USERNAME`           | Salesforce username         | Yes                              |
| `SALESFORCE_LOGIN_URL`          | Salesforce login URL        | No (defaults to production)      |
| `PORT`                          | Server port                 | No (defaults to 8080)            |
| `NODE_ENV`                      | Node environment            | No (defaults to development)     |
| `GITHUB_CLIENT_ID`              | GitHub OAuth Client ID      | Yes                              |
| `GITHUB_CLIENT_SECRET`          | GitHub OAuth Client Secret  | Yes                              |
| `JWT_SECRET`                    | JWT signing secret          | Yes                              |
| `DATABASE_PATH`                 | SQLite database path        | No (defaults to ./database.db)   |
| `OAUTH_REDIRECT_URL`            | OAuth callback URL          | Yes                              |
| `OPENZITI_ENABLED`              | Enable OpenZiti integration | No (defaults to false)           |
| `OPENZITI_CONTROLLER_URL`       | OpenZiti Controller URL     | Yes (if OpenZiti enabled)        |
| `OPENZITI_IDENTITY_PATH`        | Path to identity config     | Yes (if OpenZiti enabled)        |
| `OPENZITI_SERVICE_NAME`         | Service name in OpenZiti    | No (defaults to sfdc-api-server) |
| `OPENZITI_LOCAL_ADDRESS`        | Local bind address          | No (defaults to 127.0.0.1:8080)  |
| `OPENZITI_TUNNELER_ENABLED`     | Enable tunneler mode        | No (defaults to false)           |
| `OPENZITI_TUNNELER_CONFIG_PATH` | Tunneler config path        | Yes (if tunneler enabled)        |

## 📁 Project Structure

```
src/
├── config/
│   ├── salesforce.ts          # Salesforce configuration
│   └── openziti.ts            # OpenZiti configuration
├── routes/
│   └── salesforce.ts          # API route definitions
├── services/
│   ├── salesforceClient.ts    # Salesforce API client
│   ├── jwtService.ts          # JWT token management
│   └── openziti.service.ts    # OpenZiti network service
├── middleware/
│   └── openziti.ts            # OpenZiti middleware
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
- **OpenZiti Zero-Trust**: Encrypted connections with fine-grained access control
- **Connection Monitoring**: Real-time connection tracking and health monitoring

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

4. **OpenZiti Integration Issues**
   - Verify OpenZiti Controller is running and accessible
   - Check identity configuration file exists and is valid
   - Ensure proper OpenZiti policies are configured
   - Review OpenZiti service logs for connection issues

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
