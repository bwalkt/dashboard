# Salesforce Keys Directory

This directory contains the private key and certificate files required for Salesforce JWT OAuth2 authentication.

## Required Files

### 1. `private.key` - Private Key

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
