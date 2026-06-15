# Aurora Prometheus Metrics Implementation

## Overview

Basic Prometheus metrics for infrastructure monitoring have been added to the aurora package. These metrics track HTTP request performance, API usage, and error rates to monitor backend health and reliability.

## Implementation Details

### 1. Dependencies

- Added `prom-client` package (v15.1.3) for Prometheus metrics collection

### 2. HTTP Metrics Collector Plugin

**File**: `packages/aurora/src/server/aurora-fastify-plugins/httpMetricsCollector.ts`

This Fastify plugin collects HTTP request metrics with the following features:

#### Metrics Collected:

1. **`aurora_requests_total`** (Counter)
   - Total number of HTTP requests
   - Labels: status_code, method, route, endpoint_type, project_id

2. **`aurora_request_duration_seconds`** (Histogram)
   - HTTP response duration in seconds
   - Labels: status_code, method, route, endpoint_type, project_id

3. **`aurora_exceptions_total`** (Counter)
   - Total number of exceptions raised
   - Labels: exception

#### Configuration:

- **Prefix**: `aurora` (customizable)
- **Excluded Paths**: `/metrics` (requests to the metrics endpoint are not tracked)
- **Labels**:
  - `status_code`: HTTP status code (e.g., "200", "404", "500")
  - `method`: HTTP method in lowercase (e.g., "get", "post", "put")
  - `route`: Request route with intelligent grouping (see below)
  - `endpoint_type`: Type of endpoint (trpc, api, module, asset, spa, vite-dev)
  - `project_id`: OpenStack project ID extracted from URL path or query parameters (empty string if not applicable)

#### Route Label Structure

The `route` label is designed to provide meaningful insights while controlling cardinality:

**tRPC API calls** (primary focus):

- Format: `service/action`
- Examples:
  - `/polaris-bff/compute.listImages` → `compute/listImages`
  - `/polaris-bff/network.getFloatingIp` → `network/getFloatingIp`
  - `/polaris-bff/storage.listContainers` → `storage/listContainers`
- Maps directly to backend router structure (compute, network, storage, services, auth, project)

**Static assets**:

- Grouped by file extension to reduce cardinality
- Examples: `*.js`, `*.css`, `*.png`, `*.woff`

**SPA routes**:

- Dynamic segments replaced with `:id`
- Examples:
  - `/projects/abc-123/compute` → `/projects/:id/compute`
  - `/accounts/def-456` → `/accounts/:id`

**Vite dev server** (development only):

- All Vite paths (`/@fs/`, `/@vite/`, `/@id/`) grouped as `vite-dev`
- Prevents cardinality explosion from individual source file requests

#### Endpoint Types

- **`trpc`**: tRPC procedure calls (the main API endpoints)
- **`api`**: Regular REST API endpoints
- **`module`**: JavaScript/CSS/JSON modules and sourcemaps
- **`asset`**: Static assets (images, fonts, icons)
- **`spa`**: Single-page application routes
- **`vite-dev`**: Vite development server paths (dev-only)

#### Design Rationale

**Production-optimized**:

- In production, Vite builds everything into bundled files served from `dist/client/`
- Only ~5-10 unique static file routes (main bundle, vendor bundle, CSS, etc.)
- tRPC procedure calls remain the primary metrics focus

**Low cardinality**:

- ~50-100 tRPC procedures (one per API endpoint)
- ~10 static asset types (grouped by extension)
- 1 grouped category for all Vite dev noise
- Dynamic IDs replaced with `:id` placeholders
- Project IDs tracked separately in dedicated label (not part of route)

**Per-project visibility**:

- `project_id` label extracted from URL path (`/projects/{id}/...`) or query parameters
- Enables per-project monitoring: which projects generate most traffic, errors, or latency
- Empty string when not applicable (root routes, assets, non-project-scoped requests)
- Works for both tRPC API calls and SPA routes

**Infrastructure focus**:

- Tracks backend API performance and reliability
- Monitors request rates, latencies, and error rates
- Designed for SRE/DevOps monitoring and alerting

### 3. Metrics Endpoint

**Endpoint**: `GET /metrics`

- Exposes metrics in Prometheus text format
- Content-Type: `text/plain; version=0.0.4; charset=utf-8`
- Standard Prometheus scrape target

### 4. Integration

The metrics collector is registered in the Fastify server setup (`server.ts`):

- Creates a dedicated Registry for metrics
- Registers the plugin early in the middleware chain
- Adds the `/metrics` endpoint to expose collected metrics

## Usage

### Access Metrics

```bash
curl http://localhost:3000/metrics
```

### Example Metrics Output

**Production environment**:

```
# HELP aurora_requests_total The total number of HTTP requests handled by the application
# TYPE aurora_requests_total counter
aurora_requests_total{status_code="200",method="post",route="compute/listImages",endpoint_type="trpc",project_id="abc-123-def-456"} 245
aurora_requests_total{status_code="200",method="post",route="network/listFloatingIps",endpoint_type="trpc",project_id="abc-123-def-456"} 89
aurora_requests_total{status_code="200",method="post",route="storage/listContainers",endpoint_type="trpc",project_id="xyz-789-ghi-012"} 56
aurora_requests_total{status_code="200",method="get",route="*.js",endpoint_type="module",project_id=""} 12
aurora_requests_total{status_code="200",method="get",route="*.css",endpoint_type="module",project_id=""} 3
aurora_requests_total{status_code="200",method="get",route="/projects/:id/compute",endpoint_type="spa",project_id="abc-123-def-456"} 15

# HELP aurora_request_duration_seconds The HTTP response duration of the application
# TYPE aurora_request_duration_seconds histogram
aurora_request_duration_seconds_bucket{le="0.005",status_code="200",method="post",route="compute/listImages",endpoint_type="trpc",project_id="abc-123-def-456"} 180
aurora_request_duration_seconds_bucket{le="0.01",status_code="200",method="post",route="compute/listImages",endpoint_type="trpc",project_id="abc-123-def-456"} 230
aurora_request_duration_seconds_bucket{le="0.025",status_code="200",method="post",route="compute/listImages",endpoint_type="trpc",project_id="abc-123-def-456"} 245
aurora_request_duration_seconds_sum{status_code="200",method="post",route="compute/listImages",endpoint_type="trpc",project_id="abc-123-def-456"} 1.234
aurora_request_duration_seconds_count{status_code="200",method="post",route="compute/listImages",endpoint_type="trpc",project_id="abc-123-def-456"} 245

# HELP aurora_exceptions_total The total number of exceptions raised by the application
# TYPE aurora_exceptions_total counter
aurora_exceptions_total{exception="TRPCError"} 5
aurora_exceptions_total{exception="ZodError"} 2
```

**Development environment** (includes Vite dev noise):

```
aurora_requests_total{status_code="200",method="get",route="vite-dev",endpoint_type="vite-dev",project_id=""} 1523
aurora_requests_total{status_code="304",method="get",route="vite-dev",endpoint_type="vite-dev",project_id=""} 847
```

_Note: All Vite dev paths (`/@fs/`, `/@vite/`, `/@id/`) are grouped as `vite-dev` to prevent cardinality explosion._

## Prometheus Configuration

### Scrape Configuration

Add this to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "aurora-dashboard"
    scrape_interval: 15s
    static_configs:
      - targets: ["localhost:3000"]
    metrics_path: "/metrics"
```

### Example Queries

**Request rate by service**:

```promql
rate(aurora_requests_total{endpoint_type="trpc"}[5m])
```

**Request rate by project**:

```promql
sum by (project_id) (rate(aurora_requests_total{endpoint_type="trpc"}[5m]))
```

**Top 10 most active projects**:

```promql
topk(10,
  sum by (project_id) (rate(aurora_requests_total{endpoint_type="trpc",project_id!=""}[5m]))
)
```

**P95 latency by service**:

```promql
histogram_quantile(0.95,
  rate(aurora_request_duration_seconds_bucket{endpoint_type="trpc"}[5m])
)
```

**P95 latency by project**:

```promql
histogram_quantile(0.95,
  sum by (project_id, le) (rate(aurora_request_duration_seconds_bucket{endpoint_type="trpc"}[5m]))
)
```

**Error rate**:

```promql
rate(aurora_requests_total{status_code=~"5.."}[5m])
```

**Error rate by project**:

```promql
sum by (project_id) (rate(aurora_requests_total{status_code=~"5..",project_id!=""}[5m]))
```

**Most used API endpoints**:

```promql
topk(10,
  sum by (route) (rate(aurora_requests_total{endpoint_type="trpc"}[5m]))
)
```

**Most used API endpoints for a specific project**:

```promql
topk(10,
  sum by (route) (rate(aurora_requests_total{endpoint_type="trpc",project_id="abc-123-def-456"}[5m]))
)
```

## Files Changed

- `packages/aurora/package.json` - Added prom-client dependency
- `packages/aurora/src/server/aurora-fastify-plugins/httpMetricsCollector.ts` - New metrics collector plugin
- `packages/aurora/src/server/aurora-fastify-plugins/index.ts` - Export metrics collector
- `packages/aurora/src/server/server.ts` - Register metrics collector and add /metrics endpoint

## Testing

A test file has been created at:

- `packages/aurora/src/server/aurora-fastify-plugins/httpMetricsCollector.test.ts`

Note: If you experience issues running server-level tests locally/CI, ensure the test environment doesn't try to start the Vite dev server (prefer unit-testing the plugin with a minimal Fastify instance).
