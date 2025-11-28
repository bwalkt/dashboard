# GitHub Workflows

This document outlines the GitHub Actions workflows and required secrets for this repository.

## Overview

This repository uses GitHub Actions workflows to build Docker images and deploy them to Dokploy. Each service has its own workflow file that:
- Triggers only when files in the service directory change (using `paths` property)
- Builds and pushes Docker images to GitHub Container Registry (GHCR)
- Deploys to Dokploy using the API after successful builds

## Workflow Structure

Each service has an independent workflow file:
- `sfdc-example.yml` - SFDC Example frontend application
- `portal.yml` - Portal frontend application
- `sfdc-server-vanilla.yml` - SFDC Server Vanilla backend service
- `golang-proxy.yml` - Golang Proxy service
- `server.yml` - Main server backend service
- `server-postgres.yml` - Server Postgres variant (deploys to same Dokploy service as server)

## Required Secrets

### Core Secrets

#### `GITHUB_TOKEN`
- **Type**: Automatic (provided by GitHub)
- **Description**: GitHub token used for authenticating with GitHub Container Registry (GHCR)
- **Used by**: All workflows
- **Note**: This is automatically provided by GitHub Actions and does not need to be manually configured

#### `DOKPLOY_DOMAIN`
- **Type**: Manual
- **Description**: Your Dokploy instance domain (without protocol)
- **Used by**: All deployment jobs in all workflows
- **Example**: `dokploy.example.com`
- **How to obtain**: Your Dokploy instance URL

#### `DOKPLOY_TOKEN`
- **Type**: Manual
- **Description**: API token for authenticating with Dokploy API
- **Used by**: All deployment jobs in all workflows
- **How to obtain**: Generate from your Dokploy instance's API settings

### Compose IDs

Compose IDs are hardcoded in the workflow files. Each service maps to a Dokploy compose deployment:

| Service | Compose ID | Workflow File |
|---------|-----------|---------------|
| sfdc-example | `uSiEe3hyQaI60cdYKzcD_` | `sfdc-example.yml` |
| portal (pzero-portal) | `CxPNwWpzxuNCU-FSQby1E` | `portal.yml` |
| sfdc-server-vanilla | `KV9PMu-zDGF87ouVN9RQM` | `sfdc-server-vanilla.yml` |
| server (pzero-server) | `FVP2k-L1wjdtK8w_pzUjq` | `server.yml`, `server-postgres.yml` |
| golang-proxy | Uses secret | `golang-proxy.yml` |

### Portal Build Arguments (Optional)

These secrets are used as build arguments for the Portal Docker image. They are optional and will default to empty strings if not provided:

#### `VITE_BACKEND_URL`
- **Type**: Optional
- **Description**: Backend URL for the Portal frontend application
- **Used by**: `portal.yml` workflow
- **Note**: Used as a build argument during Docker image build

#### `VITE_USE_PROXY`
- **Type**: Optional
- **Description**: Flag to enable/disable proxy usage in the Portal application
- **Used by**: `portal.yml` workflow
- **Note**: Used as a build argument during Docker image build

#### `VITE_PROXY_URL`
- **Type**: Optional
- **Description**: Proxy URL for the Portal application
- **Used by**: `portal.yml` workflow
- **Note**: Used as a build argument during Docker image build

#### `VITE_PROXY_TARGET`
- **Type**: Optional
- **Description**: Proxy target URL for the Portal application
- **Used by**: `portal.yml` workflow
- **Note**: Used as a build argument during Docker image build

#### `VITE_OTEL_EXPORTER_URL`
- **Type**: Optional
- **Description**: OpenTelemetry exporter URL for the Portal application
- **Used by**: `portal.yml` workflow
- **Note**: Used as a build argument during Docker image build

## Workflow Summary

**Base Required Secrets** (all workflows): `DOKPLOY_DOMAIN`, `DOKPLOY_TOKEN`

| Workflow | Additional Required Secrets | Optional Secrets | Compose ID |
|----------|---------------------------|------------------|------------|
| `sfdc-example.yml` | None | None | `uSiEe3hyQaI60cdYKzcD_` |
| `portal.yml` | None | `VITE_BACKEND_URL`, `VITE_USE_PROXY`, `VITE_PROXY_URL`, `VITE_PROXY_TARGET`, `VITE_OTEL_EXPORTER_URL` | `CxPNwWpzxuNCU-FSQby1E` |
| `sfdc-server-vanilla.yml` | None | None | `KV9PMu-zDGF87ouVN9RQM` |
| `golang-proxy.yml` | `DOKPLOY_COMPOSE_ID_GOLANG_PROXY` | None | Uses secret |
| `server.yml` | None | None | `FVP2k-L1wjdtK8w_pzUjq` |
| `server-postgres.yml` | None | None | `FVP2k-L1wjdtK8w_pzUjq` |

**Note**: `server.yml` and `server-postgres.yml` deploy to the same Dokploy service (pzero-server) since they are part of the same docker-compose stack.

## How to Configure Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name (exactly as listed above)
5. Enter the secret value
6. Click **Add secret**

## Deployment Process

Each workflow follows this process:

1. **Build Job**: 
   - Checks out the code
   - Builds the Docker image using the service-specific Dockerfile
   - Pushes the image to GHCR with appropriate tags
   - Uses build cache for faster builds

2. **Deploy Job** (only on pushes to `main`, not on pull requests):
   - Triggers Dokploy deployment via API call
   - Uses the hardcoded compose ID for the service
   - Sends POST request to `/api/compose.deploy` endpoint with `composeId` in the request body

## Path-Based Triggering

Each workflow uses the `paths` property to trigger only when relevant files change:
- `sfdc-example.yml`: Triggers on changes to `examples/b2b/packages/sfdc-example/**`
- `portal.yml`: Triggers on changes to `packages/portal/**`
- `sfdc-server-vanilla.yml`: Triggers on changes to `examples/b2b/packages/sfdc-server-vanilla/**`
- `golang-proxy.yml`: Triggers on changes to `packages/golang-proxy/**`
- `server.yml`: Triggers on changes to `packages/server/**`
- `server-postgres.yml`: Triggers on changes to `packages/server/**`

This ensures workflows only run when their respective services are modified, improving CI/CD efficiency.

## Notes

- All workflows use `GITHUB_TOKEN` which is automatically provided by GitHub Actions
- Secrets are case-sensitive - ensure exact matches with the names listed above
- Optional secrets will default to empty strings if not provided, which may cause build issues if the application requires them
- Compose IDs are hardcoded in workflow files (except golang-proxy which uses a secret)
- Keep secrets secure and never commit them to the repository
- Deployments only occur on pushes to `main` branch, not on pull requests

## Troubleshooting

If workflows are failing:

1. **Check secret names**: Ensure all secret names match exactly (case-sensitive)
2. **Verify Dokploy domain**: Ensure `DOKPLOY_DOMAIN` is set correctly (without protocol)
3. **Verify compose IDs**: Ensure the hardcoded compose IDs match your Dokploy instance
4. **Review workflow logs**: Check the workflow logs for specific error messages related to missing or invalid secrets
5. **Test API endpoint**: Verify the Dokploy API endpoint is accessible: `https://<your-domain>/api/compose.deploy`

