# @cobaltcore-dev/aurora

An OpenStack dashboard library. Provides a ready-made Fastify server and a React UI component that you wire up in your own app.

## Installation

```bash
npm install @cobaltcore-dev/aurora
```

**Peer dependencies** you must also install:

```bash
npm install react react-dom fastify
```

## Quick start

Aurora has two entry points: `server` and `client`.

### Server

```ts
import path from "path"
import { createServer } from "@cobaltcore-dev/aurora/server"

const server = await createServer({
  identityEndpoint: "https://keystone.example.com/v3/",
  policyDir: path.resolve(__dirname, "../policies"),
})

server.listen({ host: "0.0.0.0", port: 4000 })
```

### Client

```tsx
import { AuroraApp } from "@cobaltcore-dev/aurora/client"

export function App() {
  return (
    <AuroraApp
      bffEndpoint="/polaris-bff"
      theme="theme-light"
      onThemeChange={(theme) => localStorage.setItem("theme", theme)}
    />
  )
}
```

## Configuration reference

### `createServer(config)`

| Option                            | Type          | Required | Default                    | Description                                                      |
| --------------------------------- | ------------- | -------- | -------------------------- | ---------------------------------------------------------------- |
| `identityEndpoint`                | `string`      | yes      | —                          | OpenStack Keystone v3 URL                                        |
| `policyDir`                       | `string`      | yes      | —                          | Absolute path to a directory of OpenStack policy YAML files      |
| `bffEndpoint`                     | `string`      | no       | `"/polaris-bff"`           | URL prefix for all tRPC routes                                   |
| `viteRoot`                        | `string`      | no       | —                          | Directory that contains `dist/client/` in production             |
| `defaultEndpointInterface`        | `string`      | no       | `"public"`                 | OpenStack service catalog interface                              |
| `proxyUrl`                        | `string`      | no       | —                          | HTTP proxy for OpenStack calls (dev only, ignored in production) |
| `cephRegion`                      | `string`      | no       | —                          | Ceph RGW region for S3 operations                                |
| `imageMetadataExcludedProperties` | `string`      | no       | —                          | Comma-separated image metadata keys to hide in the UI            |
| `cookieName`                      | `string`      | no       | `"dashboard-session-auth"` | Override the session cookie name                                 |
| `crossDomainCookie`               | `boolean`     | no       | `true`                     | Share cookie across subdomains                                   |
| `insecureCookies`                 | `boolean`     | no       | `false`                    | Disable `Secure` flag — only for HTTP-only local dev             |
| `routers`                         | `AnyRouter[]` | no       | `[]`                       | Additional tRPC routers — see [Custom routers](#custom-routers)  |

## Custom routers

`createServer` accepts a `routers` option so consumers can add their own tRPC procedures that run alongside the built-in Aurora routes, sharing the same Fastify request context (session, cookies, OpenStack client).

### Requirements

Routers passed via `routers` **must** be created with the `auroraRouter` function exported from `@cobaltcore-dev/aurora/server`. Using a different `initTRPC` instance produces an incompatible context type and will cause runtime failures when procedures access `ctx.openstack`, `ctx.validateSession`, etc.

For the full list of exported procedure builders and router utilities, see [`src/server/index.ts`](./src/server/index.ts).

### Example

```ts
import { z } from "zod"
import { auroraRouter, protectedProcedure, createServer } from "@cobaltcore-dev/aurora/server"

const customRouter = auroraRouter({
  feedback: protectedProcedure.input(z.object({ message: z.string() })).mutation(async ({ input }) => {
    // ctx.validateSession(), ctx.openstack — all available here
    return { status: "received" }
  }),
})

const server = await createServer({
  identityEndpoint: "https://keystone.example.com/v3/",
  policyDir: path.resolve(__dirname, "../policies"),
  routers: [customRouter],
})
```

The procedure above is reachable at `POST <bffEndpoint>/feedback` via the tRPC client.

### Registering additional Fastify plugins

`createServer` returns the `FastifyInstance` before `.listen()` is called. You can register any Fastify plugin — metrics, tracing, custom middleware — on the returned instance before starting the server:

```ts
const server = await createServer({ ... })

server.register(MyPlugin, { ... })
server.get("/healthz", async () => ({ ok: true }))

await server.listen({ host: "0.0.0.0", port: 4000 })
```

### `<AuroraApp />`

| Prop              | Type                            | Default          | Description                                                                                                         |
| ----------------- | ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `bffEndpoint`     | `string`                        | `"/polaris-bff"` | Must match the server's `bffEndpoint`                                                                               |
| `theme`           | `"theme-light" \| "theme-dark"` | `"theme-light"`  | Initial theme                                                                                                       |
| `onThemeChange`   | `(theme) => void`               | —                | Called when the user toggles the theme                                                                              |
| `appName`         | `string`                        | `"Aurora"`       | App name shown in the header breadcrumb and logo                                                                    |
| `slots`           | `Slots`                         | —                | Optional UI extension points — see [Slots](#slots)                                                                  |
| `onTrackEvent`    | `OnTrackEventCallback`          | —                | Called on user interactions for analytics — see [Analytics](#analytics)                                             |
| `enabledServices` | `string[]`                      | —                | Whitelist of service keys to show. When omitted, all services are shown — see [Enabled services](#enabled-services) |

## Slots

Slots let you inject your own React components into specific locations inside `AuroraApp` without forking the package. Each slot receives an `auroraContext` object with a `client` (tRPC client) for making API calls.

```tsx
import type { SlotProps } from "@cobaltcore-dev/aurora/client"

function MyLogo(_props: SlotProps) {
  return <img src="/my-logo.svg" alt="My App" style={{ height: "1.5rem" }} />
}

function MyBanner({ auroraContext }: SlotProps) {
  // auroraContext.client gives you access to the tRPC API
  return <div>Custom sidebar content</div>
}

function MyFooter(_props: SlotProps) {
  return (
    <footer>
      <a href="/imprint">Imprint</a> · <a href="/privacy">Privacy</a>
    </footer>
  )
}

;<AuroraApp
  slots={{
    logo: MyLogo,
    sideNavBanner: MyBanner,
    pageFooter: MyFooter,
  }}
/>
```

### Available slots

| Slot                    | Location                                                                     | `auroraContext` extras         | Renders in shadow DOM |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------------ | --------------------- |
| `logo`                  | Page header, replacing the default Aurora logo                               | —                              | No                    |
| `sideNavBanner`         | Bottom of the project side navigation                                        | —                              | Yes                   |
| `pageFooter`            | Page footer, replacing the default empty footer                              | —                              | No                    |
| `login`                 | Replaces the default login form — use in OIDC environments                   | —                              | No                    |
| `serviceBadge`          | Inline next to each service label in the side nav and project home cards     | `currentService` (service key) | No                    |
| `servicePageActions`    | Beside the page title in the service page header                             | `currentService` (service key) | No                    |
| `serviceBanner`         | Below the page title divider on every service page                           | `currentService` (service key) | No                    |
| `projectsBanner`        | Below the "Projects" heading on the projects list page                       | —                              | No                    |
| `projectOverviewBanner` | Below the project description on the project overview page (`/projects/:id`) | —                              | No                    |

The `serviceBadge`, `servicePageActions`, and `serviceBanner` slots receive `auroraContext.currentService` — a string identifying which service is being rendered (e.g. `"images"`, `"ceph-containers"`). Return `null` from these slots to suppress rendering for specific services.

**Service key reference:** `"images"`, `"flavors"`, `"securitygroups"`, `"floatingips"`, `"containers"`, `"ceph-containers"`, `"pca"`

**Shadow DOM isolation:** Slots rendered in a shadow DOM cannot inherit styles from the host page. If your slot component uses a CSS framework, inject the styles inline:

```tsx
import styles from "my-lib/styles.css?inline"

function MyBanner(_props: SlotProps) {
  return (
    <>
      <style>{styles}</style>
      <div>...</div>
    </>
  )
}
```

## Enabled services

By default all services available in the OpenStack catalog are shown in the side navigation and project home page. Pass `enabledServices` to restrict which services are visible:

```tsx
<AuroraApp enabledServices={["ceph-containers", "securitygroups"]} />
```

Only services whose key appears in the array will be shown. Services absent from the catalog are always hidden regardless of this list.

**Available service keys:** `"images"`, `"flavors"`, `"securitygroups"`, `"floatingips"`, `"containers"`, `"ceph-containers"`, `"pca"`

In a Vite-based consumer app you can drive this from an environment variable:

```ts
// vite consumer
enabledServices={import.meta.env.VITE_ENABLED_SERVICES?.split(",").map(s => s.trim())}
```

```bash
# .env
VITE_ENABLED_SERVICES="ceph-containers,securitygroups"
```

## Analytics

Aurora provides an optional `onTrackEvent` callback to track user interactions and feature usage. The API is source-agnostic, supporting various event types like navigation, link clicks, modals, and more.

### Basic usage

```tsx
import { AuroraApp, type TrackEventPayload } from "@cobaltcore-dev/aurora/client"

function trackEvent(payload: TrackEventPayload) {
  // Router navigation example:
  // payload.source = "router"
  // payload.action = "/_auth/projects/$projectId/compute/images"
  // payload.metadata = { pathname: "/projects/abc/compute/images", search: "?tab=details", section: "compute", service: "images" }

  sendAnalytics("user-interaction", {
    source: payload.source,
    action: payload.action,
    ...payload.metadata,
    timestamp: Date.now(),
  })
}

;<AuroraApp bffEndpoint="/polaris-bff" onTrackEvent={trackEvent} />
```

### TrackEventPayload

The callback receives a `TrackEventPayload` object with the following fields:

| Field      | Type                                                       | Description                                                              |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `source`   | `string`                                                   | Event source (e.g., "router", "external-link", "modal")                  |
| `action`   | `string`                                                   | Action identifier (e.g., route ID, button name, link URL)                |
| `metadata` | `Record<string, string \| number \| boolean \| undefined>` | Source-specific context (pathname, section, service, href, target, etc.) |

### Built-in tracking sources

#### Router navigation (`source: "router"`)

Automatically tracked when users navigate between routes. Fires on every route change via TanStack Router's `onResolved` event.

- **`action`**: Route ID (e.g., `"/_auth/projects/$projectId/compute/images"`)
- **`metadata`**: Always includes `pathname`; includes `search` (query string) when present; optionally includes `section` and `service` if the route defines them in `staticData`

**Example event:**

```javascript
{
  source: "router",
  action: "/_auth/projects/$projectId/compute/images",
  metadata: {
    pathname: "/projects/my-project/compute/images",
    search: "?memberStatus=accepted",  // Query string, undefined if empty
    section: "compute",    // Optional: from route staticData
    service: "images"      // Optional: from route staticData
  }
}
```

### Extending with custom tracking

The `onTrackEvent` callback is available in the router context, allowing any component to track custom interactions:

```tsx
import { useRouteContext } from "@tanstack/react-router"

function MyComponent() {
  const { onTrackEvent } = useRouteContext()

  const handleExternalLinkClick = (href: string) => {
    onTrackEvent?.({
      source: "external-link",
      action: href,
      metadata: { target: "_blank" },
    })
  }

  return (
    <a href="https://docs.example.com" onClick={() => handleExternalLinkClick("https://docs.example.com")}>
      Docs
    </a>
  )
}
```

### Implementation notes

- Router events are tracked via subscription to TanStack Router's `onResolved` event
- Automatic deduplication - fires once per navigation
- Errors in your callback are caught and logged to prevent breaking the app
- The callback executes **after** navigation completes

## License

Apache-2.0
