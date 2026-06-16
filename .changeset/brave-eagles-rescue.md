---
"@cobaltcore-dev/aurora": minor
---

feat(metrics): add Prometheus metrics for infrastructure monitoring

Added comprehensive Prometheus metrics collection for HTTP requests, including:

- `aurora_requests_total`: Counter tracking total HTTP requests with labels for status_code, method, route, endpoint_type, and project_id
- `aurora_request_duration_seconds`: Histogram measuring request latency with the same label dimensions
- `aurora_exceptions_total`: Counter tracking unhandled exceptions by exception type

Key features:
- Intelligent route normalization to control cardinality (tRPC procedures, static assets, SPA routes, Vite dev paths)
- Per-project visibility via project_id label extracted from URLs and query parameters
- tRPC batch request support (comma-separated procedures in route label)
- Excludes /metrics endpoint from collection to prevent recursion
- Debug logging for skipped metrics to aid troubleshooting

New endpoint: `GET /metrics` exposes metrics in Prometheus text format for scraping.

Note: project_id label creates one time series per unique project. Monitor Prometheus memory usage in production deployments with thousands of projects.
