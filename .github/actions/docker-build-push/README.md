# Docker Build and Push Action

A reusable GitHub Action that builds a Docker image from a Dockerfile and pushes it to a Docker registry.

## Features

- 🔐 Secure authentication with Docker registry
- 🏗️ Flexible build context and Dockerfile paths
- 🏷️ Automatic tagging based on Git events
- 📦 Multi-platform builds support
- 💾 Docker layer caching
- 🔧 Customizable build arguments and labels
- 📤 Configurable push behavior

## Usage

### Basic Example

```yaml
- name: Build and push Docker image
  uses: ./.github/actions/docker-build-push
  with:
    dockerfile: 'api/auth/Dockerfile'
    context: 'api/auth'
    image-name: 'auth-service'
    image-tag: 'v1.0.0'
    registry-username: ${{ secrets.DOCKER_USERNAME }}
    registry-password: ${{ secrets.DOCKER_PASSWORD }}
```

### Advanced Example with Caching

```yaml
- name: Build and push Docker image with caching
  uses: ./.github/actions/docker-build-push
  with:
    dockerfile: 'api/auth/Dockerfile'
    context: 'api/auth'
    image-name: 'auth-api'
    image-tag: 'latest'
    registry-username: ${{ secrets.DOCKER_USERNAME }}
    registry-password: ${{ secrets.DOCKER_PASSWORD }}
    cache-from: 'registry.incmix.com/auth:cache'
    cache-to: 'type=registry,ref=registry.incmix.com/auth:cache,mode=max'
    build-args: 'NODE_ENV=prod,BUILD_VERSION=${{ github.sha }}'
    platforms: 'linux/amd64,linux/arm64'
```

### Build Only (No Push)

```yaml
- name: Build Docker image only
  uses: ./.github/actions/docker-build-push
  with:
    dockerfile: 'Dockerfile'
    image-name: 'my-app'
    push: 'false'
    registry-username: ${{ secrets.DOCKER_USERNAME }}
    registry-password: ${{ secrets.DOCKER_PASSWORD }}
```

## Inputs

| Input        | Description                                          | Required | Default      |
| ------------ | ---------------------------------------------------- | -------- | ------------ |
| `dockerfile` | Path to the Dockerfile (relative to repository root) | ✅        | `Dockerfile` |
| `context`    | Build context path (relative to repository root)     | ❌        | `.`          |
| `image-name` | Name of the Docker image (without tag)               | ✅        | -            |
| `image-tag`  | Tag for the Docker image                             | ❌        | `latest`     |

| `registry-username` | Docker registry username (from secrets)                 | ✅        | -                             |
| `registry-password` | Docker registry password (from secrets)                 | ✅        | -                             |
| `push`              | Whether to push the image to the registry               | ❌        | `true`                        |
| `cache-from`        | Comma-separated list of images to use as cache sources  | ❌        | -                             |
| `cache-to`          | Cache destination (e.g., type=registry,ref=image:cache) | ❌        | -                             |
| `build-args`        | Comma-separated list of build arguments (key=value)     | ❌        | -                             |
| `labels`            | Comma-separated list of labels (key=value)              | ❌        | -                             |
| `platforms`         | Comma-separated list of platforms to build for          | ❌        | `linux/amd64`                 |

## Outputs

| Output         | Description               |
| -------------- | ------------------------- |
| `image-digest` | Digest of the built image |
| `image-id`     | ID of the built image     |

## Required Secrets

Add these secrets to your repository:

- `DOCKER_USERNAME`: Username for the Docker registry
- `DOCKER_PASSWORD`: Password for the Docker registry

## Registry Configuration

This action is configured to work with the `https://registry.incmix.com` registry.

## Automatic Tagging

The action automatically generates tags based on:
- Git branch name
- Git PR number
- Git commit SHA (with branch prefix)
- Custom tag specified in `image-tag`

## Examples for Different Services

### Auth API
```yaml
- name: Build auth service
  uses: ./.github/actions/docker-build-push
  with:
    dockerfile: 'api/auth/Dockerfile'
    context: 'api/auth'
    image-name: 'auth-service'
    registry-username: ${{ secrets.DOCKER_USERNAME }}
    registry-password: ${{ secrets.DOCKER_PASSWORD }}
```

### Users API
```yaml
- name: Build users API
  uses: ./.github/actions/docker-build-push
  with:
    dockerfile: 'api/auth/Dockerfile'
    context: 'api/auth'
    image-name: 'auth'
    registry-username: ${{ secrets.DOCKER_USERNAME }}
    registry-password: ${{ secrets.DOCKER_PASSWORD }}
```

### Projects API
```yaml
- name: Build projects API
  uses: ./.github/actions/docker-build-push
  with:
    dockerfile: 'api/projects-api/Dockerfile'
    context: 'api/projects-api'
    image-name: 'projects-api'
    registry-username: ${{ secrets.DOCKER_USERNAME }}
    registry-password: ${{ secrets.DOCKER_PASSWORD }}
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**: Ensure `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets are correctly set
2. **Build Context Error**: Verify the `context` path exists and contains the Dockerfile
3. **Push Permission**: Ensure the registry user has push permissions for the specified image name

### Debug Mode

The action runs with debug flags enabled. Check the GitHub Actions logs for detailed build information.
