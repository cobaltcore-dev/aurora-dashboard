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

| Option                            | Type      | Required | Default                    | Description                                                      |
| --------------------------------- | --------- | -------- | -------------------------- | ---------------------------------------------------------------- |
| `identityEndpoint`                | `string`  | yes      | —                          | OpenStack Keystone v3 URL                                        |
| `policyDir`                       | `string`  | yes      | —                          | Absolute path to a directory of OpenStack policy YAML files      |
| `bffEndpoint`                     | `string`  | no       | `"/polaris-bff"`           | URL prefix for all tRPC routes                                   |
| `viteRoot`                        | `string`  | no       | —                          | Directory that contains `dist/client/` in production             |
| `defaultEndpointInterface`        | `string`  | no       | `"public"`                 | OpenStack service catalog interface                              |
| `proxyUrl`                        | `string`  | no       | —                          | HTTP proxy for OpenStack calls (dev only, ignored in production) |
| `cephRegion`                      | `string`  | no       | —                          | Ceph RGW region for S3 operations                                |
| `imageMetadataExcludedProperties` | `string`  | no       | —                          | Comma-separated image metadata keys to hide in the UI            |
| `cookieName`                      | `string`  | no       | `"dashboard-session-auth"` | Override the session cookie name                                 |
| `crossDomainCookie`               | `boolean` | no       | `true`                     | Share cookie across subdomains                                   |
| `insecureCookies`                 | `boolean` | no       | `false`                    | Disable `Secure` flag — only for HTTP-only local dev             |

### `<AuroraApp />`

| Prop               | Type                            | Default          | Description                                                         |
| ------------------ | ------------------------------- | ---------------- | ------------------------------------------------------------------- |
| `bffEndpoint`      | `string`                        | `"/polaris-bff"` | Must match the server's `bffEndpoint`                               |
| `theme`            | `"theme-light" \| "theme-dark"` | `"theme-light"`  | Initial theme                                                       |
| `onThemeChange`    | `(theme) => void`               | —                | Called when the user toggles the theme                              |
| `appName`          | `string`                        | `"Aurora"`       | App name shown in the header breadcrumb and logo                    |
| `slots`            | `Slots`                         | —                | Optional UI extension points — see [Slots](#slots)                  |
| `onUserNavigation` | `OnUserNavigationCallback`      | —                | Called on route changes for analytics — see [Analytics](#analytics) |

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

| Slot            | Location                                        | Renders in shadow DOM |
| --------------- | ----------------------------------------------- | --------------------- |
| `logo`          | Page header, replacing the default Aurora logo  | No                    |
| `sideNavBanner` | Bottom of the project side navigation           | Yes                   |
| `pageFooter`    | Page footer, replacing the default empty footer | No                    |

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

## Analytics

Aurora provides an optional `onUserNavigation` callback to track user interactions and feature usage. The API is source-agnostic, supporting various event types like navigation, link clicks, and more.

### Basic usage

```tsx
import { AuroraApp, type UserNavigationMetrics } from "@cobaltcore-dev/aurora/client"

function trackUserInteraction(metrics: UserNavigationMetrics) {
  // Example: Router navigation
  // metrics.source = "router"
  // metrics.action = "compute_images"
  // metrics.metadata = { pathname: "/compute/images", section: "compute", service: "images" }

  sendAnalytics("user-interaction", {
    source: metrics.source,
    action: metrics.action,
    ...metrics.metadata,
    timestamp: Date.now(),
  })
}

;<AuroraApp bffEndpoint="/polaris-bff" onUserNavigation={trackUserInteraction} />
```

### UserNavigationMetrics

The callback receives a `UserNavigationMetrics` object with the following fields:

| Field      | Type                                                       | Description                                                                                   |
| ---------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `source`   | `string`                                                   | Event source (e.g., "router", "external-link", "modal")                                       |
| `action`   | `string`                                                   | Action identifier (e.g., "compute_images", "download_certificate")                            |
| `metadata` | `Record<string, string \| number \| boolean \| undefined>` | Source-specific context (e.g., pathname, routeId for router; href, target for external links) |

### Built-in tracking sources

#### Router navigation (`source: "router"`)

Automatically tracked when users navigate between routes with `section` and `service` metadata:

- `action`: `"{section}_{service}"` (e.g., "compute_images", "network_security_groups")
- `metadata`: Contains `pathname`, `routeId`, `section`, and `service`

### Implementation notes

- The callback is executed **asynchronously** to prevent blocking the UI
- Rapid navigation is **debounced** to avoid duplicate tracking
- Errors in your callback are **caught and logged** to prevent breaking the app
- Router tracking only fires for routes with complete `section` and `service` metadata

## License

Apache-2.0
