# Golang Server with GitHub OAuth and SQLite

This is a Go server that implements GitHub OAuth authentication and stores user information in SQLite database.

## Features

- GitHub OAuth 2.0 authentication
- SQLite database for user storage
- JWT token-based authentication
- Session management
- Protected API endpoints
- Ziti integration for secure networking

## Setup

### 1. GitHub OAuth App Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - Application name: `Your App Name`
   - Homepage URL: `http://localhost:8080`
   - Authorization callback URL: `http://localhost:8080/auth/callback`
4. Copy the Client ID and Client Secret

### 2. Environment Configuration

Copy the example environment file and update it with your values:

```bash
cp env.example .env
```

Update the following variables in `.env`:

- `GITHUB_CLIENT_ID`: Your GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET`: Your GitHub OAuth app client secret
- `JWT_SECRET`: A secure random string for JWT signing
- `DATABASE_PATH`: Path to SQLite database file (default: `./users.db`)

### 3. Install Dependencies

```bash
go mod tidy
```

### 4. Run the Server

```bash
go run .
```

The server will start on `http://localhost:8080`

## API Endpoints

### Public Endpoints

- `GET /` - Home page with login link
- `GET /login` - Initiate GitHub OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `GET /logout` - Logout and clear session
- `GET /api/public/greet?name=John` - Public greeting endpoint

### Protected Endpoints (require authentication)

- `GET /dashboard` - User dashboard
- `GET /api/profile` - Get user profile information

## Authentication Methods

The server supports two authentication methods:

1. **Session-based**: Uses HTTP cookies for web browsers
2. **JWT Token**: Use `Authorization: Bearer <token>` header for API access

## Database Schema

The SQLite database contains a `users` table with the following fields:

- `id`: Unique user ID (UUID)
- `github_id`: GitHub user ID
- `username`: GitHub username
- `email`: User email
- `name`: User's full name
- `avatar_url`: GitHub avatar URL
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

## Docker Support

### Using Docker Compose (Recommended)

Before running docker-compose, create the required external Docker network:

```bash
docker network create pzero
```

Then start the services:

```bash
docker-compose up -d
```

The services will be available on:

- HTTP: `http://localhost:8080`
- HTTPS: `https://localhost:8443`

### Using Docker Directly

Build and run with Docker:

```bash
# Build the image
docker build -t golang-oauth-server .

# Run the container
docker run -p 8080:8080 \
  -e GITHUB_CLIENT_ID=your_client_id \
  -e GITHUB_CLIENT_SECRET=your_client_secret \
  -e JWT_SECRET=your_jwt_secret \
  golang-oauth-server
```

## Security Notes

- Change the `JWT_SECRET` in production
- Use HTTPS in production
- Consider using environment variables for sensitive data
- Regularly update dependencies

## Development

To enable debug logging:

```bash
DEBUG=true go run .
```
