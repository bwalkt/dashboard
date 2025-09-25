# @dashboard/shared-types

Shared TypeScript types for the dashboard project.

## Overview

This package contains shared TypeScript type definitions that are used across multiple packages in the dashboard monorepo.

## Types Included

- **Order Types**: Salesforce Order object types and related interfaces
- **Product Types**: Salesforce Product object types and related interfaces

## Usage

```typescript
import { SalesforceOrder, SalesforceProduct } from "@dashboard/shared-types";
```

## Development

```bash
# Build the package
pnpm build

# Watch for changes during development
pnpm dev

# Clean build artifacts
pnpm clean
```
