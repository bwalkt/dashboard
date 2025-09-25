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
   # Salesforce Configuration
   SALESFORCE_CONSUMER_KEY=your_consumer_key
   SALESFORCE_USERNAME=your_salesforce_username
   SALESFORCE_LOGIN_URL=https://login.salesforce.com

   # Optional: Custom Salesforce instance URL
   SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
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

### Authentication

- `POST /salesforce/auth` - Authenticate with Salesforce

### Data Operations

- `GET /salesforce/query` - Execute SOQL queries
- `GET /salesforce/records/:objectType` - Get records by object type
- `GET /salesforce/records/:objectType/:id` - Get specific record by ID
- `POST /salesforce/records/:objectType` - Create new record
- `PUT /salesforce/records/:objectType/:id` - Update existing record
- `DELETE /salesforce/records/:objectType/:id` - Delete record

### Utility Endpoints

- `GET /salesforce/describe/:objectType` - Get object metadata
- `GET /salesforce/limits` - Get API usage limits
- `GET /` - Health check endpoint

## 🔧 Configuration

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

| Variable                  | Description                | Required                    |
| ------------------------- | -------------------------- | --------------------------- |
| `SALESFORCE_CONSUMER_KEY` | Connected App Consumer Key | Yes                         |
| `SALESFORCE_USERNAME`     | Salesforce username        | Yes                         |
| `SALESFORCE_LOGIN_URL`    | Salesforce login URL       | No (defaults to production) |
| `SALESFORCE_INSTANCE_URL` | Custom instance URL        | No                          |

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

### Authenticate with Salesforce

```bash
curl -X POST http://localhost:8080/salesforce/auth
```

### Query Salesforce Data

```bash
curl -X GET "http://localhost:8080/salesforce/query?q=SELECT Id, Name FROM Account LIMIT 10"
```

### Create a Record

```bash
curl -X POST http://localhost:8080/salesforce/records/Account \
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
