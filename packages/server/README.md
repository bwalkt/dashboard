
A Fastify-based Node.js server that provides REST API endpoints for Salesforce integration, including authentication, data querying, and record management.

## 🚀 Features
- This is server for pzero.
- TODO We will split as microservices and use bff pattern to access various services.
- **CORS Support**: Cross-origin resource sharing enabled for frontend integration
- **TypeScript**: Full TypeScript support with type definitions
- **Fastify Framework**: High-performance Node.js web framework
- **Environment Configuration**: Secure configuration management

## 📋 Prerequisites

- Node.js (v18 or higher)
- pnpm (recommended) or npm

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

The server will start on `http://localhost:8090`

## 📚 API Endpoints

### Authentication (GitHub OAuth)

- `GET /auth/login` - Initiate GitHub OAuth flow
- `GET /auth/callback` - Handle OAuth callback from GitHub
- `GET /auth/me` - Get current user info (protected)
- `GET /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user (protected)

### Environment Variables

| Variable                  | Description                | Required                       |
| `PORT`                    | Server port                | No (defaults to 8090)          |
| `NODE_ENV`                | Node environment           | No (defaults to development)   |
| `GITHUB_CLIENT_ID`        | GitHub OAuth Client ID     | Yes                            |
| `GITHUB_CLIENT_SECRET`    | GitHub OAuth Client Secret | Yes                            |
| `JWT_SECRET`              | JWT signing secret         | Yes                            |
| `DATABASE_PATH`           | SQLite database path       | No (defaults to ./database.db) |
| `OAUTH_REDIRECT_URL`      | OAuth callback URL         | Yes                            |

## 📁 Project Structure

```
src/
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
curl -X GET http://localhost:8090/auth/login

# Get current user info (requires authentication)
curl -X GET http://localhost:8090/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**

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
