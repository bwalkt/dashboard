# B2B Example Stack

This directory contains Docker Compose configurations for running the B2B example stack, including the Salesforce integration example and authorization service.

## Prerequisites

### External Docker Network

The `pzero-network` Docker network is **external** and must be created manually before bringing up the stack:

```bash
docker network create pzero-network
```

This network is shared across multiple services and must exist before starting the containers.

### Environment Variables and Secrets

**IMPORTANT**: For production deployments, you **must** override sensitive environment variables. The `docker-compose.yml` file includes development-only defaults that are **not safe for production use**.

#### Required Secrets

- **`CHALLENGE_SECRET`**: A cryptographically random secret used for challenge/answer validation. Must be set via `.env` file or environment variable in production.
- **`JWT_SECRET`**: Secret key for JWT token signing and verification.
- **`GITHUB_CLIENT_SECRET`**: GitHub OAuth client secret.
- **`SALESFORCE_CONSUMER_KEY`**: Salesforce OAuth consumer key.

#### Generating Strong Secrets

For production deployments, generate cryptographically random secrets:

```bash
# Generate a secure random secret (32 bytes, hex encoded)
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Configuration Files

- **Development**: Use `docker-compose.yml` (includes development defaults)
- **Production**: Use `docker-compose.prod.yml` (requires all secrets to be set)

For detailed information about environment variables and the authorization service, see:
- [`../../packages/authz-service/README.md`](../../packages/authz-service/README.md) - Authorization service documentation
- [`packages/sfdc-server-vanilla/env.example`](packages/sfdc-server-vanilla/env.example) - Example environment variables

## Usage

### Development

```bash
# Ensure the external network exists
docker network create pzero-network

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

### Production

```bash
# Ensure the external network exists
docker network create pzero-network

# Set required environment variables in .env file or export them
export CHALLENGE_SECRET=$(openssl rand -hex 32)
export JWT_SECRET=$(openssl rand -hex 32)
# ... set other required variables

# Start services
docker compose -f docker-compose.prod.yml up -d
```

## Services

- **authz-service**: Authorization service for challenge/answer validation
- **dragonfly**: Redis-compatible in-memory database (development only)
- **pzero-sfdc-server-vanilla**: Salesforce integration server

## Security Notes

- Never commit `.env` files with production secrets to version control
- Use different secrets for each environment (development, staging, production)
- Rotate secrets periodically, especially if compromised
- The `CHALLENGE_SECRET` default value in `docker-compose.yml` is for development only and must be overridden in production

