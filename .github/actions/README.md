# GitHub Actions Composite Actions

This directory contains reusable composite actions that simplify the main workflow files.

## Available Actions

### 1. `detect-changes/`
**Purpose**: Detects which services have changed and need to be built.

**Inputs**:
- `force_build_all`: Boolean to force build all services (default: false)
- `event_name`: GitHub event name (pull_request, push, workflow_dispatch)
- `target_branch`: Target branch for comparison (default: main)

**Outputs**:
- `services`: JSON array of service names that need to be built

**Usage**:
```yaml
- name: Detect service changes
  uses: ./.github/actions/detect-changes
  with:
    force_build_all: ${{ github.event.inputs.force_build_all || 'false' }}
    event_name: ${{ github.event_name }}
    target_branch: ${{ github.event.inputs.target_branch || 'main' }}
```

### 2. `build-summary/`
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
**Purpose**: Builds and optionally pushes Docker images (existing action).

## Service Configuration

The `service-config/services.json` file contains all service definitions:

```json
{
  "services": [
    {
      "name": "auth",
      "dockerfile": "api/auth/Dockerfile",
      "context": "api/auth",
      "image_name": "auth-service"
    }
  ]
}
```

### Adding a New Service

1. Add the service definition to `service-config/services.json`
2. The workflow will automatically pick it up
3. No changes needed to the main workflow file

### Modifying Service Configuration

- Update the JSON file
- All workflows using this configuration will automatically reflect changes
- No need to modify multiple workflow files

## Benefits of This Approach

1. **Maintainability**: Service configurations are centralized in one JSON file
2. **Reusability**: Actions can be used across multiple workflows
3. **Readability**: Main workflow files are much cleaner and easier to understand
4. **Testing**: Actions can be tested independently
5. **Versioning**: Actions can be versioned and reused across repositories

## Best Practices

1. Keep actions focused on a single responsibility
2. Use descriptive input/output names
3. Document all inputs and outputs
4. Test actions in isolation before using in workflows
5. Use semantic versioning for actions if sharing across repositories
