# Salesforce Keys Directory

This directory contains the private key and certificate files required for Salesforce JWT OAuth2 authentication.

## Required Files

### 1. `private.pem` - Private Key

- **Format**: PEM format RSA private key
- **Usage**: Used to sign JWT assertions
- **Security**: Keep this file secure and never commit to version control

### 2. `certificate.crt` - Public Certificate

- **Format**: PEM format X.509 certificate
- **Usage**: Uploaded to Salesforce Connected App for JWT verification
- **Security**: Can be shared with Salesforce administrators

## How to Generate Keys

### Option 1: Using OpenSSL (Recommended)

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate certificate signing request
openssl req -new -key private.pem -out certificate.csr

# Generate self-signed certificate (for testing)
openssl x509 -req -days 365 -in certificate.csr -signkey private.pem -out certificate.crt

# Clean up CSR file
rm certificate.csr
```

### Option 2: Using Node.js crypto module

```javascript
const crypto = require("crypto");
const fs = require("fs");

// Generate key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

// Save keys
fs.writeFileSync("private.pem", privateKey);
fs.writeFileSync("certificate.crt", publicKey);
```

## Salesforce Connected App Setup

1. **Create Connected App**:

   - Go to Setup → App Manager → New Connected App
   - Fill in basic information (App Name, API Name, etc.)

2. **Enable OAuth Settings**:

   - Check "Enable OAuth Settings"
   - Add callback URL: `http://localhost:8080/callback` (or your app URL)
   - Select OAuth Scopes: `api`, `refresh_token`, `id`

3. **Upload Certificate**:

   - In the Connected App settings, find "Use digital signatures"
   - Upload the `certificate.crt` file
   - Note the Consumer Key (Client ID)

4. **Configure Environment Variables**:
   ```bash
   SALESFORCE_CONSUMER_KEY=your_consumer_key_here
   SALESFORCE_USERNAME=your_username@example.com
   SALESFORCE_LOGIN_URL=https://login.salesforce.com
   ```

## Security Best Practices

1. **Never commit private keys to version control**
2. **Use environment variables for sensitive configuration**
3. **Rotate keys regularly**
4. **Use different keys for different environments (dev, staging, prod)**
5. **Store keys securely (use key management services in production)**

## File Permissions

Ensure proper file permissions for security:

```bash
# Set restrictive permissions on private key
chmod 600 private.pem

# Set read-only permissions on certificate
chmod 644 certificate.crt
```

## Troubleshooting

### Common Issues

1. **"Failed to load private key"**:

   - Check file path and permissions
   - Ensure file is in PEM format

2. **"JWT verification failed"**:

   - Verify certificate matches the one uploaded to Salesforce
   - Check certificate format and validity

3. **"Authentication failed"**:
   - Verify Consumer Key is correct
   - Check username and login URL
   - Ensure Connected App is properly configured

### Testing Keys

You can test your keys using the JWT service:

```javascript
import { JWTService } from "../services/jwtService.js";

const jwtService = new JWTService();
const thumbprint = jwtService.getCertificateThumbprint();
console.log("Certificate thumbprint:", thumbprint);
```
