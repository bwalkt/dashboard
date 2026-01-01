# Email Verification Workflow - Curl Integration Tests

This directory contains curl-based integration tests for testing the complete email verification workflows against a live server.

## Prerequisites

1. **Server Running**: Start your server with `pnpm run dev`
2. **Database Connected**: Ensure PostgreSQL is running and connected
3. **Email Service**: Configure your email service (Brevo) for real email testing
4. **Redis Running**: Ensure Redis is available for rate limiting

## Quick Start

```bash
# Make script executable (if not already)
chmod +x test-curl-workflows.sh

# Run the interactive test script
./test-curl-workflows.sh
```

## Test Options

The script provides several testing options:

1. **Full Registration Workflow** - Complete email registration flow
2. **Login Workflow** - Email-based login flow (requires existing user)
3. **Rate Limiting Test** - Verify rate limiting works
4. **All Tests** - Run all tests sequentially

## Manual Curl Commands

**Important**: Add a browser User-Agent header to avoid bot detection:

```bash
# Set this for all curl commands
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
```

### Registration Workflow

```bash
# 1. Register user (with device info)
curl -X POST http://localhost:8090/auth/register \
  -H "Content-Type: application/json" \
  -H "User-Agent: $USER_AGENT" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "device": {
      "id": "device-001",
      "deviceId": "test-device",
      "deviceName": "Test Device",
      "systemName": "macOS",
      "systemVersion": "14.0",
      "model": "MacBook Pro",
      "type": "DESKTOP",
      "os": "macOS",
      "osVersion": "14.0"
    }
  }'

# 1a. Register user (without device info - backward compatible)
curl -X POST http://localhost:8090/auth/register \
  -H "Content-Type: application/json" \
  -H "User-Agent: $USER_AGENT" \
  -d '{"name":"Test User","email":"test@example.com"}'

# Expected Response:
# {
#   "message": "Verification code sent to email",
#   "email": "test@example.com",
#   "expiresIn": 600
# }

# 2. Check your email for 6-digit code, then verify
curl -X POST http://localhost:8090/auth/register/verify \
  -H "Content-Type: application/json" \
  -H "User-Agent: $USER_AGENT" \
  -d '{"email":"test@example.com","code":"123456"}'

# Expected Response (success):
# {
#   "message": "Registration completed successfully",
#   "accessToken": "eyJ...",
#   "refreshToken": "eyJ...",
#   "user": {...}
# }
```

### Login Workflow

```bash
# 1. Request login code
curl -X POST http://localhost:8090/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Expected Response:
# {
#   "message": "Verification code sent to email",
#   "email": "test@example.com",
#   "expiresIn": 600
# }

# 2. Check email for code, then verify login
curl -X POST http://localhost:8090/auth/login/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"654321"}'

# Expected Response (success):
# {
#   "message": "Login successful",
#   "accessToken": "eyJ...",
#   "refreshToken": "eyJ...",
#   "user": {...}
# }
```

### Test Authenticated Requests

```bash
# Use access token from registration/login
curl -X GET http://localhost:8090/auth/me \
  -H "Cookie: accessToken=YOUR_ACCESS_TOKEN_HERE"

# Expected Response:
# {
#   "id": 1,
#   "email": "test@example.com",
#   "name": "Test User",
#   ...
# }
```

### Rate Limiting Tests

```bash
# First registration request (should succeed)
curl -X POST http://localhost:8090/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'

# Immediate second request (should be rate limited)
curl -X POST http://localhost:8090/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'

# Expected Response (rate limited):
# {
#   "error": "Too Many Requests",
#   "message": "Please wait before attempting registration again",
#   "retryAfter": 60
# }
```

## Environment Configuration

For testing with real emails, ensure your `.env` file has:

```env
# Brevo Email Configuration
BREVO_API_KEY=your_actual_api_key
BREVO_SENDER_EMAIL=your@email.com
BREVO_SENDER_NAME=Your App Name

# PostgreSQL (for user storage)
DATABASE_URL=postgresql://user:pass@localhost:5433/pzero

# Redis (for rate limiting and codes)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## What These Tests Verify

✅ **Complete Email Workflow**: Real email sending and code verification  
✅ **Rate Limiting**: Protection against brute force attacks  
✅ **Authentication Flow**: Token generation and validation  
✅ **Error Handling**: Proper error responses for invalid requests  
✅ **Database Integration**: User creation and retrieval  
✅ **Redis Integration**: Code storage and rate limiting

## Differences from Unit Tests

| Aspect           | Unit Tests            | Curl Tests          |
| ---------------- | --------------------- | ------------------- |
| **Environment**  | Mocked services       | Real services       |
| **Database**     | Mocked                | Real PostgreSQL     |
| **Email**        | Captured in memory    | Real emails sent    |
| **Verification** | Automated             | Manual code entry   |
| **Purpose**      | Code logic validation | End-to-end workflow |

## Troubleshooting

### Bot Detection Error (403 Suspicious bot detected)

The server blocks curl's default user agent. Always include a browser user agent:

```bash
curl -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" ...
```

### Server Not Running

```bash
# Start the server
pnpm run dev
```

### Email Not Received

- Check spam folder
- Verify BREVO_API_KEY is correct
- Check server logs for email sending errors

### Database Errors

```bash
# Ensure PostgreSQL is running
brew services start postgresql
# or
docker-compose up postgres
```

### Rate Limiting Issues

```bash
# Clear Redis to reset rate limits
redis-cli FLUSHDB
```

## Best Practices

1. **Use Unique Emails**: The script generates unique emails per test run
2. **Clean Up**: Consider deleting test users from database after testing
3. **Monitor Logs**: Watch server logs while running tests
4. **Test Email Service**: Verify email delivery before running full tests

## Integration with CI/CD

For automated testing in CI/CD, you could modify the script to:

- Use a test email service that provides an API to check emails
- Parse verification codes automatically
- Run against staging environments with real services

This provides a realistic testing environment that validates the complete user experience!
