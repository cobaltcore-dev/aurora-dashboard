---
"@cobaltcore-dev/aurora": minor
---

Add `create-service`, `create-service-bff` and `create-service-ui` TanStack Intent skills

Ship three Intent skills (published under `@cobaltcore-dev/aurora`) that scaffold a new OpenStack service consistently:

- `create-service`: orchestrator that collects a short service brief and runs the two workers end to end.
- `create-service-bff`: scaffolds the server side (zod types, project-scoped tRPC resource router proxying OpenStack, permission router, registration in `buildBaseRouter`), keeping business logic on the server.
- `create-service-ui`: scaffolds the client side (file-based routes with `RouteInfo`, `apiHelpers` calling the BFF, nav entry) and builds the actual UI with the juno ui-components Intent skills whenever possible.

The package now declares `keywords: ["tanstack-intent"]` and publishes the `skills/` directories.
