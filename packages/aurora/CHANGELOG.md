# @cobaltcore-dev/aurora

## 0.4.0

### Minor Changes

- fc1bc08: show domain name on project cards by fetching auth/domains and using new juno heading system
- 641c699: ceph - apply ui/ux improvements from swift design reviews
- 5ab571f: Remove bundled OpenStack policy files from the aurora package. Consumers must now supply their own policy files via the `policyDir` option in `createServer`. The built-in `permission_policies/` directory is no longer shipped with the package.
- e5d39a9: Add bucket versioning UI with enable/disable/suspend functionality

### Patch Changes

- 711736c: fix(portal): add error component to images route to preserve layout on errors and fix ButtonSize type errors
- fc861d5: Add Clavis CA import certificates functionality

## 0.3.1

### Patch Changes

- a046b17: Image tabs are now in the action bar.

## 0.3.0

### Minor Changes

- ddd8b37: Add extensible slot system for consumer widgets

  Introduces `Slot`, `slots`, and `SlotProps` — a shadow DOM-based mechanism that lets consumers inject custom UI widgets into defined extension points in the Aurora layout.
  - `slots` — object of named slot components passed via `AuroraAppProps`
  - `SlotProps` — typed props supplied to each widget, including `auroraContext.client` for BFF access
  - `Slot` — internal component that renders a widget inside an isolated shadow root
  - `sideNavBanner` — first slot, rendered at the bottom of the project sidebar

### Patch Changes

- 4f41ac0: Deleted project list view, keeping only the card view
  Improved card view: responsive grid, ContentHeading for card titles
  Replaced manual padding divs with Juno Container
  Side nav collapsing text fixed via Juno update
  SideNavigationItem manages its own open/close state internally, so Juno's chevron no longer desyncs from the open prop
  Added routeTree.gen.ts to eslintignore

## 0.2.2

### Patch Changes

- 98db18f: added clavis CA create certificates functionality

## 0.2.1

### Patch Changes

- f14ab83: bump @cloudoperators/juno-ui-components to 6.5.0; add to minimumReleaseAgeExclude in pnpm-workspace.yaml; remove aurora-portal i18n step from pre-commit hook
- a194c98: Fix package publishing issues found during initial consumer testing:
  - Removed `@cobaltcore-dev/policy-engine` and `@cobaltcore-dev/signal-openstack` from published `dependencies` — both are private packages bundled into the server build via tsup and must not be listed as npm dependencies
  - Added `permission_policies/` to the `files` array so OpenStack YAML files are included in the published package

- 717d53f: fixed race condition of setTitle and refactored breadcrumb

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
