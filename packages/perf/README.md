# k6 Performance Tests (@pzero/perf)

This package contains k6 performance tests (TypeScript), the Control Center server (API + UI), and Docker tooling. All in one package under `packages/perf`.

## k6 Control Center (Web UI)

A dedicated dashboard to trigger k6 tests and stream logs in the browser.

Tests are **built during the Docker image build** (`pnpm --filter @pzero/perf build`); the compiled k6 output goes to `k6-dist/` and is copied to `/app/perf-dist` in the image. At runtime the server runs the **k6 binary** in the container against that pre-built dist. The **UI is served from the same server** (no separate frontend service). Logs are streamed to the UI via SSE. The Docker image includes the k6 binary (multi-stage from `grafana/k6`). For **local dev** (running the server with `pnpm dev`), run `pnpm build` in this package first and set `PERF_WORKSPACE` to `packages/perf/k6-dist`; **k6 must be installed on the host** (e.g. via [k6 install](https://grafana.com/docs/k6/latest/set-up/install-k6/)).

### Run the stack (Docker Compose)

From the repo root:

```bash
docker compose -f packages/perf/docker-compose.perf-ui.yml up --build
```

Or use the root script:

```bash
pnpm perf:ui
```

- **UI and API:** http://localhost:8099 (single service; open the root URL for the Control Center).

Open http://localhost:8099, pick a test (or "All tests"), set **AUTH_TOKEN** (saved in localStorage), and click **Launch Load Test**. The live console shows k6 output; when the run finishes, a "done" event reports the exit code.

Only **AUTH_TOKEN** is configured in the UI. Other variables (`BASE_URL`, `PROXY_TARGET`, `STATIC_CHALLENGE_ANSWER`, `STATIC_CHALLENGE_ID`) must be set in the server environment (e.g. docker-compose `environment` or host env when running locally).

### Run server locally (no Docker)

Build this package (k6 tests + UI + server) once, then run the server. **k6 must be installed on the host.**

```bash
pnpm --filter @pzero/perf build
PERF_WORKSPACE="$(pwd)/packages/perf/k6-dist" BASE_URL=... PROXY_TARGET=... pnpm --filter @pzero/perf dev
```

Or from repo root after building:

```bash
pnpm dev:perf
```

(Set `PERF_WORKSPACE`, `BASE_URL`, `PROXY_TARGET`, etc. in the environment before running.)

Open http://localhost:8099 for the Control Center (same origin for UI and API).

## Package layout

- **tests/** – k6 test sources (TypeScript); build output: **k6-dist/**
- **src/** – Control Center server (Fastify, API, static UI)
- **ui/** – React UI (Vite)
- **docker-compose.perf-ui.yml** – Compose file for the full stack (run from repo root)
- **Dockerfile** – Single image: k6 + server + UI (build from repo root)

## Running tests (CLI / scripts)

### Build k6 tests

```bash
pnpm --filter @pzero/perf build:k6
```

Output is in `packages/perf/k6-dist/`.

### Run tests locally (k6 installed)

```bash
pnpm --filter @pzero/perf build:k6
K6_DIST=./packages/perf/k6-dist ./packages/perf/run-tests.sh
```

Or run a single test:

```bash
k6 run --env AUTH_TOKEN=your_token packages/perf/k6-dist/sfdc-server-vanilla.test.js
```

### docker-run.sh (optional)

`docker-run.sh` in this package builds and runs tests in Docker. It expects a **tests-only** image (not the Control Center image). The primary way to run tests is via the Control Center UI or `run-tests.sh` with k6 on the host. If you add a separate Dockerfile that only builds `tests/` → k6-dist and runs k6, point `docker-run.sh` at it; the script uses `k6-dist` paths.

## Test files

- **tests/sfdc-server-vanilla.test.ts** – Main test for sfdc-server-vanilla GET endpoints (with auth and challenge handling)
- **tests/utils.ts** – Shared k6 helpers (auth, proxy headers, challenge manager)

## Environment variables (k6 tests)

- `AUTH_TOKEN` – JWT token (required)
- `PROXY_TARGET` – Proxy target URL (default: `http://pzero-sfdc-server:3000`)
- `BASE_URL` – Base API URL (default: `https://pzero-envoy.incmix.com/proxy`)
- `STATIC_CHALLENGE_ANSWER` – Static string sent as `x-challenge-answer` (default: `static-secret`). Must match backend/Redis.
- `STATIC_CHALLENGE_ID` – Optional challenge ID when the server does not return one.

## sfdc-server-vanilla tests

Cover GET endpoints (except login) with authentication and challenge handling. Challenge handling uses a static answer (`STATIC_CHALLENGE_ANSWER`); no grid-based solving.

### Tested endpoints

- `GET /salesforce/:objectType/query` – Query Salesforce records (Order, Product2, etc.)
- `GET /salesforce/Order/query/last-30-days` – Orders from last 30 days
- `GET /salesforce/records/:objectType/:recordId` – Single record by ID
- `GET /salesforce/metadata/:objectType` – Object metadata

### Adding new tests

1. Add a new `*.test.ts` file in **tests/**.
2. Follow the same structure as existing tests (e.g. use `utils.ts` for auth/challenge).
3. After `pnpm build:k6`, the new test will appear in k6-dist and in the Control Center test list.
