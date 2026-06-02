# @cobaltcore-dev/aurora

## 0.2.0

### Minor Changes

- b8a4cd7: `@cobaltcore-dev/aurora` is now available as a standalone npm package.

  Install it directly:

  ```bash
  npm install @cobaltcore-dev/aurora
  ```

  **Server** — starts a Fastify BFF pre-wired with OpenStack tRPC routes:

  ```ts
  import { createServer } from "@cobaltcore-dev/aurora/server"

  createServer({
    identityEndpoint: process.env.IDENTITY_ENDPOINT,
    bffEndpoint: process.env.BFF_ENDPOINT,
  }).then((server) => server.listen({ host: "0.0.0.0", port: 4000 }))
  ```

  **Client** — self-contained React dashboard UI:

  ```tsx
  import { AuroraApp } from "@cobaltcore-dev/aurora/client"

  ;<AuroraApp bffEndpoint="/polaris-bff" theme="theme-light" />
  ```

  All configuration flows in from the consumer — the package never reads `process.env` or `localStorage` directly. See the [README](https://github.com/cobaltcore-dev/aurora-dashboard/tree/main/packages/aurora) for the full usage guide.
