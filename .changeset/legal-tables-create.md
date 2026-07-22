---
"@cobaltcore-dev/aurora": patch
---

Fix RouteError always showing default error message instead of tRPC messages from the response
- __root.tsx / $projectId.tsx — pass safeErrorMessage to RouteError for TRPCClientError to fix generic fallback text
- Remove errorComponent at projects/index.tsx and images.tsx, it was catching it instead of letting it bubble to ProjectErrorComponent
- expand ErrorBoundary to wrap the search bar too so it's hidden on error instead of orphaned above the error message
- remove unused invalidateCsrfToken function
