# GitHub Actions Composite Actions

This directory contains reusable composite actions that simplify the main workflow files.

## Available Actions

### 1. `build-summary/`
**Purpose**: Generates build summaries for GitHub step summary.

**Inputs**:
- `service`: Service name being built
- `image_name`: Docker image name
- `registry_url`: Docker registry URL
- `image_tag`: Docker image tag
- `event_name`: GitHub event name
- `pr_number`: Pull request number (optional)
- `image_id`: Docker image ID (optional)

**Usage**:
```yaml
- name: Build summary
  uses: ./.github/actions/build-summary
  with:
    service: ${{ matrix.service }}
    image_name: ${{ fromJson(steps.service-config.outputs.config).image_name }}
    registry_url: ${{ env.REGISTRY_URL }}
    image_tag: ${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.number) || github.ref_name }}
    event_name: ${{ github.event_name }}
    pr_number: ${{ github.event.number }}
    image_id: ${{ steps.build.outputs.image-id }}
```

### 3. `docker-build-push/`
**Purpose**: Builds and optionally pushes Docker images.

### 4. `trigger-dokploy-deployment/`
**Purpose**: Triggers a Dokploy deployment via webhook.

## Workflow Structure

Each service has its own workflow file in `.github/workflows/` that:
- Uses the `paths` property to trigger only when relevant files change
- Contains its own build and deploy steps
- Is independent of other service workflows

### Adding a New Service

1. Create a new workflow file in `.github/workflows/` (e.g., `my-service.yml`)
2. Configure the `paths` property to watch the service's directory
3. Add build and deploy steps as needed
4. Reference the appropriate composite actions

## Benefits of This Approach

1. **Isolation**: Each service workflow is independent
2. **Efficiency**: Workflows only run when relevant files change
3. **Reusability**: Actions can be used across multiple workflows
4. **Readability**: Each workflow file is focused on a single service
5. **Testing**: Actions can be tested independently

## Best Practices

1. Keep actions focused on a single responsibility
2. Use descriptive input/output names
3. Document all inputs and outputs
4. Test actions in isolation before using in workflows
5. Use semantic versioning for actions if sharing across repositories
